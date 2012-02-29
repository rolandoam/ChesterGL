JAVA = /usr/bin/java
CLOSURE_HOME = ${HOME}/Applications/closure-compiler
CLOSURE_LIBRARY= ${HOME}/Applications/closure-library
CLOSURE_JAR = compiler.jar
OUTPUT_DIR ?= $(PWD)/html
# default name for library
OUTPUT_FILE = chester.js
SOURCES = chesterGL/core.js chesterGL/block.js chesterGL/blockFrames.js chesterGL/blockGroup.js
#BlockGroup.js BlockFrames.js TMXBlock.js Actions.js ParticleSystem.js
# externs should live in the same dir as the compiler.jar
EXTERNS = jquery-1.5.js base64.js glMatrix-1.0.0.js webkit_console.js google_analytics_api.js
COMPILE_LEVEL_RELEASE = ADVANCED_OPTIMIZATIONS
COMPILE_LEVEL_DEBUG = $(COMPILE_LEVEL_RELEASE)
# the next line just for docs
JSDOC_HOME = ${HOME}/Applications/jsdoc-toolkit
DOC_OUTPUT = doc

# do not modify after this line unless you know what you're doing

JS_SOURCES = $(foreach i,${SOURCES},-i $i)
EXTERNS_TMP = $(foreach i,${EXTERNS},--externs $(CLOSURE_HOME)/$i)
COMPILER_ARGUMENTS = $(EXTERNS_TMP) --language_in=ECMASCRIPT5 --warning_level=VERBOSE --jscomp_warning=checkTypes --summary_detail_level=3

compile:
	${JAVA} -jar ${CLOSURE_HOME}/${CLOSURE_JAR} ${COMPILER_ARGUMENTS} --compilation_level $(COMPILE_LEVEL_RELEASE) \
	${JS_SOURCES} --js_output_file $(OUTPUT_DIR)/$(OUTPUT_FILE)

deps:
	${CLOSURE_LIBRARY}/closure/bin/build/closurebuilder.py --root ${CLOSURE_LIBRARY}  \
		--output_mode=list \
		--output_file=deps.list \
		--root=chesterGL/ \
		${JS_SOURCES}

debug_flags:
	echo $(COMPILER_ARGUMENTS) > debug.flags
	echo "--externs deps.js" >> debug.flags
	echo "--formatting=PRETTY_PRINT" >> debug.flags
	echo "-D ENABLE_DEBUG=1" >> debug.flags
	echo "--create_source_map=$(OUTPUT_DIR)/$(OUTPUT_FILE).map" >> debug.flags

debug: debug_flags
	${CLOSURE_LIBRARY}/closure/bin/build/closurebuilder.py --root ${CLOSURE_LIBRARY}  \
		--output_mode=compiled \
		--output_file=$(OUTPUT_DIR)/$(OUTPUT_FILE) \
		--compiler_jar=$(CLOSURE_HOME)/$(CLOSURE_JAR) \
		--root=chesterGL/ \
		--compiler_flags="--flagfile=debug.flags" \
		${JS_SOURCES}

# just cat everything into chester.js (when debugging is getting hard)
debug-plain:
	cat ${SOURCES} > $(OUTPUT_DIR)/$(OUTPUT_FILE)

clean:
	rm -f $(OUTPUT_DIR)/$(OUTPUT_FILE)

fetch-externs:
	$(foreach i,${EXTERNS},curl -o ${CLOSURE_HOME}/$i http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/$i;)

doc: ${SOURCES}
	${JAVA} -jar ${JSDOC_HOME}/jsrun.jar ${JSDOC_HOME}/app/run.js -w -version 170 -v -a -t=${JSDOC_HOME}/templates/jsdoc ${SOURCES} -d=${DOC_OUTPUT}
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
