#!/bin/bash
if [ $# == 0 ]; then
	echo "Not enough arguments"
	exit
fi

if [ ! -d "$1" ]; then
	echo "Directory doesn't exist"
	exit
fi

csv=$(find "$1" -type f -name "*.csv")

num_csv=$(echo "$csv" | wc -l)

echo -n "CSV Summary: "
if [ $num_csv -ge 1 ]; then
	echo -e "$num_csv files found\n$(ls -1 $csv)"
else 
	echo "No CSV file found"
	exit
fi
