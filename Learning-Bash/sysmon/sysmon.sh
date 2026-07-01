#!/bin/bash
if [ "$1" = "--verbose" ]; then
	verbose="true"
	echo "verbose mode on"
fi

echo "-- Memory --"

cat /proc/meminfo | grep MemAvailable

mem=$(cat /proc/meminfo | grep MemAvailable | awk '{print $2}')


if [ "$verbose" = "true" ]; then
	memTotal=$(cat /proc/meminfo | grep 'MemTotal' | awk '{print $2}')
	memFree=$(cat /proc/meminfo | grep 'MemFree' | awk '{print $2}')

	echo -e "MemTotal: $memTotal kb\nMemFree: $memFree kb"
fi		

if [ $mem -gt 1000000 ]; then
	echo "memory ok"
else 
	echo "memory low"
fi


echo -e "\n--CPU--"

cat /proc/cpuinfo | grep "model name" | uniq

for process in bash ssh cron fakeprogram; do
	echo $(pgrep $process)
done
