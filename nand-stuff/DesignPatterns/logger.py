
class Logger:
    def __init__(self):
        self.logs = []

    def log(self, message):
        self.logs.append(message)

    def history(self):
        print(self.logs)

logger = Logger()

