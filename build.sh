#/bin/sh

set -e

# The list of files to include in the service.
files=$(find -s\
 css\
 icons\
 js\
 site.webmanifest\
 webfonts\
 -type f)


# The current version in index.html.
version=$(grep 'name="version" content=' index.html | sed -E 's#.*content="(.*)".*#\1#')

# The current version of the service-worker; it will get updated with the version from index.html.
current=$(grep 'version =' service-worker.js | sed -E 's#.* version = ([0-9]+);.*#\1#')

case "$1" in
  help)
    echo "http - local server"
    echo "bump - increment version in index.html"
    echo "sync - update local files with the version from the V2Web repository"
    ;;

  http)
    if [[ "$current" == "$version" ]]; then
      echo "Serving version: $current"
    else
      echo "Serving versions: $current - $version"
    fi

    exec python3 -m http.server
    ;;

  bump)
    new=$(($version + 1))
    echo "New version: $version -> $new"
    sed -i '' -E 's#name="version" content=".*"#name="version" content="'$new'"#' index.html
    exit
    ;;

  sync)
    echo "Syncing files:"
    rsync -a --log-format=%f --exclude=.git --omit-dir-times --checksum --existing ../../versioduo/V2Web/ .
    exit
    ;;

  "")
    if [[ "$current" == "$version" ]]; then
      echo "Building version: $current"
    else
      echo "Building version: $current -> $version"
    fi

    echo "Unsynced files:"
    rsync -an --log-format=%f --exclude=.git --omit-dir-times --checksum --existing ../../versioduo/V2Web/ .

    # The list of source files as a JavaScript array.
    array=\'./\'
    for file in $files; do
      array="$array,\n  \'$file\'"
    done

    # The project name; used as the name of the cache database.
    name=$(grep 'name="name" content=' index.html | sed -E 's#.*content="(.*)".*#\1#')

    # The ISO date for the 'revised' field in index.html.
    date=$(date "+%Y-%m-%d")

    # Create a service-worker script file with the current version and the list of source files.
    cp service-worker-template.js service-worker.js
    sed -i '' -E "s#__NAME__#$name#" service-worker.js
    sed -i '' -E "s#__VERSION__#$version#" service-worker.js
    sed -i '' -E "s#__FILES__#$array#" service-worker.js

    # Update the date in index.html.
    sed -i '' -E 's#name="revised" content=".*"#name="revised" content="'$date'"#' index.html
    exit
    ;;

  *)
    echo "Unknown command"
    exit 1
    ;;
esac

