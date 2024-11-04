import os
import chardet

def count_characters(filename):
    """Counts the number of characters in a file."""
    with open(filename, "rb") as f:
        result = chardet.detect(f.read())
        encoding = result["encoding"]

    with open(filename, "r", encoding=encoding) as f:
        return len(f.read())

def count_all_characters(directory):
  """Counts the number of characters in all files in a directory and its subdirectories."""
  total_characters = 0
  for root, directories, filenames in os.walk(directory):
    for filename in filenames:
      total_characters += count_characters(os.path.join(root, filename))
  return total_characters

if __name__ == "__main__":
  directory = "./"
  total_characters = count_all_characters(directory)
  print("The total number of characters in all files in {} is {}.".format(directory, total_characters))
