import glob from "glob";

export function findFiles(pattern: string, directory: string) {
  return new Promise<string[]>((resolve, reject) => {
    return glob(pattern, { cwd: directory }, (error, matches) => {
      if (error) {
        return reject(error);
      }

      return resolve(matches);
    });
  });
}
