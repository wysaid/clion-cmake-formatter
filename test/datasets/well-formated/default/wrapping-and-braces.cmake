cmake_minimum_required(VERSION 3.0)
project(HelloWorld)

include(${CMAKE_ROOT}/Helpers/hello_world_helper.cmake)

function(
    say
    word
)
    message("${word}")
endfunction()

add_executable(foo
    bar.cxx
)

if (TRUE
    AND FALSE
)
    say(Hi)
endif ()

