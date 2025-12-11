# Test file to verify lineLength validation
# This file can be formatted with different lineLength settings

# Short command - should not wrap with lineLength=40
set(VAR value)

# Medium command - should wrap with lineLength=40
set(MEDIUM_VAR value1 value2 value3 value4 value5)

# Long command - should definitely wrap with lineLength=40
set(LONG_VARIABLE_NAME arg1 arg2 arg3 arg4 arg5 arg6 arg7 arg8 arg9 arg10)

# Very long command - should wrap even with lineLength=0 (unlimited) if input is already multi-line
target_link_libraries(myapp
    library1
    library2
    library3
)
