JAVA = /usr/bin/java
CLOSURE_HOME = ${HOME}/Applications/closure-compiler
CLOSURE_JAR = compiler.jar
OUTPUT_DIR ?= $(PWD)/html
# default name for library
OUTPUT_FILE = chester.js
SOURCES = core.js Block.js BlockGroup.js BlockFrames.js TMXBlock.js Actions.js ParticleSystem.js
# externs should live in the same dir as the compiler.jar
EXTERNS = jquery-1.5.js base64.js glMatrix-1.0.0.js webkit_console.js google_analytics_api.js
COMPILE_LEVEL_RELEASE = ADVANCED_OPTIMIZATIONS
COMPILE_LEVEL_DEBUG = $(COMPILE_LEVEL_RELEASE)
# the next line just for docs
JSDOC_HOME = ${HOME}/Applications/jsdoc-toolkit
DOC_OUTPUT = doc

# do not modify after this line unless you know what you're doing

JS_SOURCES = $(foreach i,${SOURCES},--js $i)
EXTERNS_TMP = $(foreach i,${EXTERNS},--externs $(CLOSURE_HOME)/$i)
COMPILER_ARGUMENTS = $(EXTERNS_TMP) --externs deps.js --warning_level VERBOSE --jscomp_warning=checkTypes --summary_detail_level 3

compile:
	${JAVA} -jar ${CLOSURE_HOME}/${CLOSURE_JAR} ${COMPILER_ARGUMENTS} --compilation_level $(COMPILE_LEVEL_RELEASE) \
	${JS_SOURCES} --js_output_file $(OUTPUT_DIR)/$(OUTPUT_FILE)

# use other compile level and make it pretty print as well
debug:
	${JAVA} -jar ${CLOSURE_HOME}/${CLOSURE_JAR} \
		${COMPILER_ARGUMENTS} --compilation_level $(COMPILE_LEVEL_DEBUG) \
		--formatting PRETTY_PRINT ${JS_SOURCES} \
		--js_output_file $(OUTPUT_DIR)/$(OUTPUT_FILE)

# just cat everything into chester.js (when debugging is getting hard)
debug-plain:
	cat ${SOURCES} > $(OUTPUT_DIR)/$(OUTPUT_FILE)

clean:
	rm -f $(OUTPUT_DIR)/$(OUTPUT_FILE)

fetch-externs:
	$(foreach i,${EXTERNS},curl -o ${CLOSURE_HOME}/$i http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/$i;)

doc: ${SOURCES}
	${JAVA} -jar ${JSDOC_HOME}/jsrun.jar ${JSDOC_HOME}/app/run.js -v -a -t=${JSDOC_HOME}/templates/jsdoc ${SOURCES} -d=${DOC_OUTPUT}
	mkdir -p doc/test
	cp html/test_* doc/test/
	cp html/*.css doc/test/
	cp -r html/images doc/test/
	cp -r html/shaders doc/test/
	cp -r html/externals doc/test/
	cp -r html/index.html doc/test/
	cp -r html/chester.js doc/test/

server:
	ruby -rwebrick -e's = WEBrick::HTTPServer.new(:Port => 3000, :DocumentRoot => "${OUTPUT_DIR}"); trap("INT"){ s.shutdown }; s.start'
