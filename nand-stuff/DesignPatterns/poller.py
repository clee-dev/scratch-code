from datetime import datetime, timedelta
import time
import random

class poller():

    def __init__(self):
        self.observers = []
    
    def register(self, observer):
        self.observers.append(observer)

    def notify(self, metrics):
        for alert in self.observers:
            alert.update(metrics)

    def poll(self, runtime_minutes, poll_frequency_minutes, command):
        end_time = datetime.now() + timedelta(minutes=runtime_minutes)
        results = {"WAF": 1, "Capacity": 1000}

        while datetime.now() < end_time:

            results["WAF"] = random.randint(1,4)
            results["Capacity"] -= random.randint(25,100)

            self.notify(results)
            print(f"Poll cycle: {results}")
            time.sleep(poll_frequency_minutes*60)


