#!/bin/bash
read -p $'This tool displays all files in directory\nEnter Directory: ' path
if [ ! -d "$path" ]; then
    echo "not a directory"
    exit
fi
echo "PATH: $path"

find "$path" -type f | while read file; do
	echo $(du -h "$file")
done
#for file in $files; do
#	echo $(ls -lh $file)
#done
