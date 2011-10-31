JAVA = /usr/bin/java
CLOSURE_HOME = /Users/rolando/Applications/closure-compiler
CLOSURE_JAR = compiler.jar
OUTPUT_DIR ?= $(PWD)/html
# default name for library
OUTPUT_FILE = chester.js
SOURCES = core.js Block.js BlockGroup.js BlockFrames.js TMXBlock.js
# externs should live in the same dir as the compiler.jar
EXTERNS = jquery-1.5.js base64.js glMatrix-1.0.0.js webkit_console.js
COMPILE_LEVEL = SIMPLE_OPTIMIZATIONS
# the next line just for docs
JSDOC_HOME = /Users/rolando/Applications/jsdoc-toolkit
DOC_OUTPUT = doc

# do not modify after this line unless you know what you're doing

JS_SOURCES = $(foreach i,${SOURCES},--js $i)
EXTERNS_TMP = $(foreach i,${EXTERNS},--externs $(CLOSURE_HOME)/$i)
COMPILER_ARGUMENTS = --compilation_level $(COMPILE_LEVEL) $(EXTERNS_TMP) --warning_level VERBOSE --summary_detail_level 2 --externs deps.js

compile:
	${JAVA} -jar ${CLOSURE_HOME}/${CLOSURE_JAR} ${COMPILER_ARGUMENTS} ${JS_SOURCES} --js_output_file $(OUTPUT_DIR)/$(OUTPUT_FILE)

# just cat everything into chester.js
debug:
	cat ${SOURCES} > $(OUTPUT_DIR)/$(OUTPUT_FILE)

clean:
	rm -f $(OUTPUT_DIR)/$(OUTPUT_FILE)

doc: ${SOURCES}
	${JAVA} -jar ${JSDOC_HOME}/jsrun.jar ${JSDOC_HOME}/app/run.js -v -a -t=${JSDOC_HOME}/templates/jsdoc ${SOURCES} -d=${DOC_OUTPUT}

server:
	ruby -rwebrick -e's = WEBrick::HTTPServer.new(:Port => 3000, :DocumentRoot => "${OUTPUT_DIR}"); trap("INT"){ s.shutdown }; s.start'
