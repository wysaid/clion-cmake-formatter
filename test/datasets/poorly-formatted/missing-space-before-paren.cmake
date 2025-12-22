# Test file with missing space before parentheses on control flow
if(TRUE)
    message("no space before if paren")
endif()

foreach(item IN ITEMS a b c)
    message("no space before foreach paren")
endforeach()

while(TRUE)
    message("no space before while paren")
    break()
endwhile()
