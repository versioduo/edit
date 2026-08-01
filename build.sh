#/bin/sh

set -o errexit
set -o errtrace; trap 'echo "Error ${?} ${BASH_SOURCE[0]:-?}:${LINENO:-?}"' ERR
set -o nounset
set -o pipefail

# The list of files to include in the service.
files=$(find -s\
 css\
 icons\
 js\
 manifest.json\
 webfonts\
 -type f)


# The current version in index.html.
version=$(grep 'name="version" content=' index.html | sed -E 's#.*content="(.*)".*#\1#')

case "${1:-}" in
  help)
    echo "http - local server"
    echo "bump - increment version in index.html"
    echo "sync - update local files with the version from the V2Web repository"
    ;;

  http)
    echo "Serving version: ${version}"
    exec python3 -m http.server
    ;;

  bump)
    new=$(($version + 1))
    echo "New version: $version -> ${new}"
    sed -i '' -E 's#name="version" content=".*"#name="version" content="'${new}'"#' index.html
    version=${new}
    ;;

  sync)
    echo "Syncing files:"
    rsync -a --log-format=%f --exclude=.git --exclude=README.md --omit-dir-times --checksum --existing ../../versioduo/V2Web/ .
    ;;

  "")
    ;;

  *)
    echo "Unknown command"
    exit 1
    ;;
esac

echo "Building version: ${version}"

echo "Checking unsynced files:"
rsync -an --log-format=%f --exclude=.git --exclude=README.md --omit-dir-times --checksum --existing ../../versioduo/V2Web/ .

# The list of source files as a JavaScript array.
array=\'./\'
for file in $files; do
  array="${array},\n  \'${file}\'"
done

# The project name; used as the name of the cache database.
name=$(grep 'name="name" content=' index.html | sed -E 's#.*content="(.*)".*#\1#')

# The ISO date for the 'revised' field in index.html.
date=$(date "+%Y-%m-%d")

# Create a service-worker script file with the current version and the list of source files.
cp service-worker-template.js service-worker.js
sed -i '' -E "s#__NAME__#${name}#" service-worker.js
sed -i '' -E "s#__VERSION__#${version}#" service-worker.js
sed -i '' -E "s#__FILES__#${array}#" service-worker.js

# Update the date in index.html.
sed -i '' -E 's#name="revised" content=".*"#name="revised" content="'${date}'"#' index.html

