import copy

def load_csv(filepath):

    result = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            headers = f.readline().strip().split(',')

            for line in f:
                l = line.strip().split(',')
                result.append({key: val for key, val in zip(headers, l)})
    except FileNotFoundError:      
        print("File not found")
    return result

def get_failures(test_results):
    return [ test for test in test_results if test["status"] == "fail" ]

def summarize_by_drive(test_results):
    stats = {
        "total_tests": 0,
        "failures": 0,
        "avg_throughput_mbps": [],
        "avg_latency_us": [],
        "avg_temperature_c": [] 
    }

    summary = {}
    for test in test_results:
        test_run = test["drive_id"]
        if test_run not in summary:
            summary[test_run] = copy.deepcopy(stats)
            
        summary[test_run]["total_tests"] += 1
        if test["status"] == "fail": summary[test_run]["failures"] += 1
        summary[test_run]["avg_throughput_mbps"].append(test["throughput_mbps"])
        summary[test_run]["avg_latency_us"].append(test["latency_us"])
        summary[test_run]["avg_temperature_c"].append(test["temperature_c"])

    for key, val in summary.items():
        thro_converted  = [float(x) for x in val["avg_throughput_mbps"]]
        late_converted = [float(x) for x in val["avg_latency_us"]]
        temp_converted = [float(x) for x in val["avg_temperature_c"]]
        val["avg_throughput_mbps"] = sum(thro_converted) / len(thro_converted)
        val["avg_latency_us"] = sum(late_converted) / len(late_converted)
        val["avg_temperature_c"] = sum(temp_converted) / len(temp_converted)

    return summary


def main():
    file = 'ssd_benchmarks.csv'
    csv = load_csv(file)
    get_failures(csv)
    print(summarize_by_drive(csv))
if __name__ == "__main__":
    main()

