import { readdirSync, readFileSync, statSync } from "fs";
import { extname, join, sep, posix } from "path";
import { contentType } from "mime-types";
import { S3, SharedIniFileCredentials } from "aws-sdk";
import minimatch from "minimatch";

const S3CLIENT = new S3();

export interface ICacheControlMapping {
  [glob: string]: string;
}

interface IAwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface IMimeTypeMapping {
  [glob: string]: string;
}

interface IOptions {
  delete?: boolean;
  verbose?: boolean;
  cacheControlMapping?: ICacheControlMapping;
  awsCredentials?: IAwsCredentials;
  awsProfile?: string;
  prefix?: string;
  mimeTypeMapping?: IMimeTypeMapping;
}

export const CACHE_FOREVER = "public,max-age=31536000,immutable";
export const CACHE_ONE_DAY = "public,max-age=86400";
export const NO_CACHE = "no-cache";
export const DEFAULT_CACHE_CONTROL_MAPPING: ICacheControlMapping = {
  "index.html": NO_CACHE,
  "*.css": CACHE_FOREVER,
  "*.js": CACHE_FOREVER,
  "*.png": CACHE_ONE_DAY,
  "*.ico": CACHE_ONE_DAY,
  "*.txt": CACHE_ONE_DAY,
};

const getCacheControl = (
  filepath: string,
  cacheControlMapping: ICacheControlMapping
): string | undefined => {
  for (let [glob, cacheControl] of Object.entries(cacheControlMapping)) {
    if (minimatch(filepath, glob, { matchBase: true })) {
      return cacheControl;
    }
  }
}

const walkDirectory = async (
  directoryPath: string,
  callback: (filePath: string) => any
): Promise<string[]> => {
  const processed: string[] = [];
  await Promise.all(
    readdirSync(directoryPath).map(async (entry) => {
      const filePath = join(directoryPath, entry);
      const stat = statSync(filePath);
      if (stat.isFile()) {
        const key = await callback(filePath);
        processed.push(key);
      } else if (stat.isDirectory()) {
        const uploadedRecursively = await walkDirectory(filePath, callback);
        processed.push(...uploadedRecursively);
      }
    })
  );
  return processed;
}

const getContentType = (
  filePath: string,
  mimeTypeMapping: IMimeTypeMapping
): string | undefined => {
  return (
    mimeTypeMapping[extname(filePath)] ||
    contentType(extname(filePath)) ||
    undefined
  );
}

const uploadToS3 = async (
  bucket: string,
  key: string,
  filePath: string,
  prefix: string,
  cacheControlMapping: ICacheControlMapping,
  mimeTypeMapping: IMimeTypeMapping,
  verbose: boolean = false
): Promise<string> => {
  const params = {
    Bucket: bucket,
    Key: `${prefix}${key}`,
    Body: readFileSync(filePath),
    CacheControl: getCacheControl(filePath, cacheControlMapping),
    ContentType: getContentType(filePath, mimeTypeMapping),
  };
  await S3CLIENT.putObject(params).promise();
  if (verbose) {
    console.log(
      `Uploaded s3://${params.Bucket}/${params.Key} | cache-control=${params.CacheControl} | content-type=${params.ContentType}`
    );
  }
  return params.Key;
}

const removeOldFiles = async (
  bucket: string,
  uploaded: string[],
  prefix: string,
  verbose: boolean = false,
): Promise<string[]> => {
  let existingFiles: string[] = [];
  await new Promise((resolve, reject) =>
    S3CLIENT.listObjectsV2({ Bucket: bucket }).eachPage((err, page) => {
      if (err) {
        reject(err);
        return false;
      }
      if (page) {
        existingFiles = existingFiles.concat(
          page.Contents!.map((obj) => obj.Key!)
        );
        return true;
      }
      resolve({});
      return false;
    })
  );
  const filesToDelete = existingFiles
    .filter((key) => key.startsWith(prefix))
    .filter((key) => !uploaded.includes(key));
  await Promise.all(
    filesToDelete.map(async (key) => {
      await S3CLIENT.deleteObject({ Bucket: bucket, Key: key }).promise();
      if (verbose) {
        console.log(`Deleted old file: ${key}`);
      }
    })
  );
  return filesToDelete;
}

const getPosixPath = (pathString: string): string => {
  if (!pathString) {
    return pathString;
  }

  return pathString.split(sep).join(posix.sep);
}

const s3SpaUpload = async (
  dir: string,
  bucket: string,
  options: IOptions = {}
) => {
  const regexp = new RegExp(`^${getPosixPath(dir)}/?`);
  if (!options.cacheControlMapping) {
    options.cacheControlMapping = DEFAULT_CACHE_CONTROL_MAPPING;
  }
  if (options.awsCredentials) {
    S3CLIENT.config.update({ credentials: options.awsCredentials });
  }
  if (options.awsProfile) {
    const credentials = new SharedIniFileCredentials({
      profile: options.awsProfile,
    });
    S3CLIENT.config.update({ credentials });
  }
  if (!options.mimeTypeMapping) {
    options.mimeTypeMapping = {};
  }
  if (!options.prefix) {
    options.prefix = "";
  } else {
    options.prefix = options.prefix.endsWith("/")
      ? options.prefix
      : `${options.prefix}/`;
  }
  const uploaded = await walkDirectory(dir, (filePath) =>
    uploadToS3(
      bucket,
      getPosixPath(filePath).replace(regexp, ""),
      filePath,
      options.prefix!,
      options.cacheControlMapping!,
      options.mimeTypeMapping!,
      options.verbose
    )
  );
  console.log(`Uploaded ${uploaded.length} files`);
  if (options.delete) {
    const deleted = await removeOldFiles(
      bucket,
      uploaded,
      options.prefix,
      options.verbose
    );
    console.log(`Deleted ${deleted.length} old files`);
  }
}

export default s3SpaUpload;
