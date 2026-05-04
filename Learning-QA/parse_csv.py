import pandas as pd

def main():
    df = pd.read_csv("test.csv")
    # df represents the whole csv
    # df["serial (column)"] to get a whole column
    # df[df["serial"] operator condition] to get a specific row of column 
    print(df.loc[df["firmware"] == "1.15.1", "avg_temp(C)"].info())

if __name__ == "__main__":
    main()
