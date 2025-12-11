if (bar)
    message("Bar!")
elseif (foo)
    message("boo!")
else (foobar)
    message("Foobar!")
endif (bar)

foreach (VARIABLE ${VARIABLES})
    message(${VARIABLE})
endforeach ()

while (foo)
    message("bar")
endwhile (foo)

macro(foo)
    message("bar")
endmacro(foo)

function(foo)
    message("bar")
endfunction(foo)
