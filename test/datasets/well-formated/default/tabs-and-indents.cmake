function(f1)
    foreach (_VARIABLE ${_VARIABLES})
        message(${_VARIABLE})

        message(${_VARIABLE})
    endforeach ()
    if (bar)
        message(STATUS "Bar")
    else ()
        message(STATUS "Not bar!")
    endif ()
endfunction()


foo_function0(
    "arg1"
    "arg2")

foo_function1(
    "arg1"
    "arg2"
)
