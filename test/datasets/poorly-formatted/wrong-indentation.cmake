# Test file with wrong indentation
if (TRUE)
  message("two spaces instead of four")
   set(VAR "three spaces")
     add_library(test "five spaces")
endif ()
