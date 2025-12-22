# Test file with incorrect elseif/else indentation
if (WIN32)
    message("Windows")
    elseif (APPLE)
    message("Apple")
        else ()
    message("Other")
endif ()
