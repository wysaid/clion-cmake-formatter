option(TEST_NO_LOG "Disable logging" OFF)






option(TEST_BUILD_SHARED "Build TEST as shared library" OFF
)






if (CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)



set(TEST_IS_ROOT_PROJECT ON
)




    set(TEST_IS_ROOT_PROJECT ON)





else ()





    set(TEST_IS_ROOT_PROJECT OFF
    )




endif ()










