from abc import ABC, abstractmethod
from logger import logger

class strategyBase(ABC):

    @abstractmethod
    def run(self, config):
        pass

class RandWrite(strategyBase):
    def run(self, config):
        print(f"Running RandWrite, Config: {config}!")
        logger.log(f"RandWrite Write, Config {config}!")


class SequentialWrite(strategyBase):
    def run(self, config):
        logger.log(f"Squential Write, Config {config}!")
        print(f"Running Squential Write, Config {config}!")
