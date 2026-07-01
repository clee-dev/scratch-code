from strategy import RandWrite, SequentialWrite
from workload import Workload

class factory:
    def build_workload(self, workload_type, strategy_type, config):
        strat = {
            "randwrite": RandWrite,
            "seqwrite": SequentialWrite,
        }

        wl = {
            "end": Workload,
            "stress": Workload,
            "func": Workload
        }

        strategy_instance = strat[strategy_type]()
        workload_class = wl[workload_type](strategy_instance)
        return workload_class
        
