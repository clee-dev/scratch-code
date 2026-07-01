
class Workload:
    def __init__(self, strategy):

        self.strategy = strategy

        
    def run(self, config):
        self.strategy.run(config)
