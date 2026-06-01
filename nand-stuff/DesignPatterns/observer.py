
from abc import ABC, abstractmethod
from logger import logger
from datetime import datetime

class observer(ABC):

    @abstractmethod
    def update(self, metrics):
        pass

class checkWAF(observer):
    def __init__(self, threshold):
        self.thresh = threshold

    def update(self, metrics):

        waf = metrics["WAF"]
        if waf > self.thresh:
            logger.log(f"{datetime.now()} Alert: WAF exceeded! {waf} > {self.thresh}")

class checkCap(observer):
    def __init__(self, threshold):
        self.thresh = threshold

    def update(self, metrics):
        capacity = metrics["Capacity"] 
        if capacity < self.thresh:
            logger.log(f"{datetime.now()} Alert: Capacity exceeded! {capacity} > {self.thresh}")

