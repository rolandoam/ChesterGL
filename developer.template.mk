# define the path to the closure library and closure compiler

CLOSURE_HOME = ${HOME}/Applications/closure-compiler
CLOSURE_LIBRARY = ${HOME}/Applications/closure-library

# where to put everything
OUTPUT_DIR = ${PWD}/html

# where is your java binary located? (needed for closure compiler)
JAVA = /usr/bin/java

# where do you have jsdoc-toolkit (only needed if you want to recreate the docs)
JSDOC_HOME = ${HOME}/Applications/jsdoc-toolkit
