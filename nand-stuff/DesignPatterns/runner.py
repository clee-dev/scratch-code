from logger import logger
import sys
import threading
from factory import factory
from poller import poller
from observer import checkWAF, checkCap

# workload, strategy, runtime, frequency
def main():
    if len(sys.argv)< 4:
        print("not enough required args")
        sys.exit()

    workload = sys.argv[1]
    strategy = sys.argv[2]
    runtime = float(sys.argv[3])
    frequency = float(sys.argv[4])
    config = None

    f = factory().build_workload(workload, strategy, config)
    p = poller()
    p.register(checkWAF(2.0))
    p.register(checkCap(500))

    workload_strat = threading.Thread(target=f.run, args=(config,))
    poller_observer = threading.Thread(target=p.poll, args=(runtime, frequency, None))
    workload_strat.start()
    poller_observer.start()
    workload_strat.join()
    poller_observer.join()

    logger.history()


if __name__ == "__main__":
    main()