message("Foo")

function(foobar)
    set(VAR "foobar")
endfunction(foobar)

macro(foo)
    IF (bar)
        MESSAGE("Bar")
    ENDIF (bar)
endmacro(foo)

