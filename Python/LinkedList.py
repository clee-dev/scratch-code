class Node:
    #if there is no argument passed in, next will default to None
    def __init__(self, data, next=None): 
        self.data = data
        self.next = next

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, value):
        newNode = Node(value, None)

        if self.head is None:
            self.head = newNode
            return

        currentNode = self.head

        while currentNode.next is not None:
            currentNode = currentNode.next

        currentNode.next = newNode

    def print(self):
        values = []
        currentNode = self.head

        while currentNode.next is not None:
            values.append(str(currentNode.data))

            currentNode = currentNode.next

        values.append(str(currentNode.data))
        print(" -> ".join(values))

    #add element to beginning
    def prepend(self, data):
        newNode = Node(data)

        if self.head is None:
            self.head = newNode
            return

        newNode.next = self.head
        self.head = newNode


    def find(self, value):
        if self.head is None:
            return False

        currentNode = self.head

        while currentNode.next is not None:

            if currentNode.data == value:
                return True
             
            currentNode = currentNode.next

        return currentNode.data == value


    def delete(self, value):
        if self.head is None:
            print("The linked list is empty")
            return
        
        if self.head.data == value:
            self.head = self.head.next
            return
        
        currentNode = self.head

        while currentNode.next is not None:
            
            if currentNode.next.data == value:
                temp = currentNode.next
                currentNode.next = currentNode.next.next
                del temp
                return

            currentNode = currentNode.next

    def length(self):
        len = 0
        currentNode = self.head

        while currentNode:
            len += 1
            currentNode = currentNode.next

        return len

li = LinkedList()
li.append(1)
li.append(2)
li.append(3)
li.prepend(0)
# print(li.find(0))
# li.delete(0)
print(li.length())
li.print()