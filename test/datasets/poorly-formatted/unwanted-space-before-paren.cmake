# Test file with unwanted space before parentheses on command calls
message ("unwanted space before message")
set (VAR "unwanted space before set")
add_library (mylib STATIC src.cpp)
target_link_libraries (mylib PRIVATE other)
