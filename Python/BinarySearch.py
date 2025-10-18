

def BinarySearch(data, target):

    low = 0
    high = (len(data) - 1)
    steps = 0

    while low <= high:
        mid = (low + high) // 2
        val = data[mid]
        steps += 1
        if target == val:
            print(f"Binary Search: took {steps} steps!")
            return mid
        
        elif target > val: 
            low = mid + 1

        elif target < val:
            high = mid - 1

    print(f"Binary Search: took {steps} steps!")
    return None

sample = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

test = BinarySearch(sample, 3)

print(f"Binary search returned index: {test} which is # {sample[test]}")