# Test file with mixed command case AND other formatting issues
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)
MESSAGE("uppercase commands")
SET(VAR "value")
IF(TRUE)
MESSAGE("inside if - no space before paren, wrong indent")
ENDIF()
