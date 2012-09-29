# NOTE
# if you want to define your own paths, copy developer.template.mk to developer.mk and modify that
# please do not modify anything in this makefile unless is really necesary
#

-include developer.mk

JAVA ?= /usr/bin/java

CLOSURE_HOME ?= /Applications/closure-compiler
CLOSURE_LIBRARY ?= /Applications/closure-library
CLOSURE_JAR = compiler.jar
OUTPUT_DIR ?= ${PWD}/html

# default name for library
OUTPUT_FILE = chester.js
EXTERNAL_SOURCES = 
SOURCES = ${EXTERNAL_SOURCES} chesterGL/core.js chesterGL/block.js chesterGL/blockFrames.js chesterGL/blockGroup.js chesterGL/actions.js chesterGL/tmxBlock.js chesterGL/GPUParticleSystem.js chesterGL/primitivesBlock.js chesterGL/labelBlock.js

# externs should live in the same dir as the compiler.jar
EXTERNS = jquery-1.7.js webkit_console.js google_analytics_api.js json.js
COMPILE_LEVEL_RELEASE = ADVANCED_OPTIMIZATIONS
COMPILE_LEVEL_DEBUG = ${COMPILE_LEVEL_RELEASE}

# the next line just for docs
JSDOC_HOME ?= ${HOME}/Applications/jsdoc-toolkit
DOC_OUTPUT = doc

# do not modify after this line unless you know what you're doing

JS_SOURCES = $(foreach i,${SOURCES},-i $i)
EXTERNS_TMP = $(foreach i,${EXTERNS},--externs ${CLOSURE_HOME}/$i)
COMPILER_ARGUMENTS = ${EXTERNS_TMP} --language_in=ECMASCRIPT5_STRICT --warning_level=VERBOSE --jscomp_warning=checkTypes --summary_detail_level=3

compile: flags
	${CLOSURE_LIBRARY}/closure/bin/build/closurebuilder.py --root ${CLOSURE_LIBRARY}  \
		--output_mode=compiled \
		--output_file=$(OUTPUT_DIR)/$(OUTPUT_FILE) \
		--compiler_jar=$(CLOSURE_HOME)/$(CLOSURE_JAR) \
		--root=chesterGL/ \
		--compiler_flags="--flagfile=release.flags" \
		${JS_SOURCES}

deps:
	${CLOSURE_LIBRARY}/closure/bin/build/closurebuilder.py --root ${CLOSURE_LIBRARY}  \
		--output_mode=list \
		--root=chesterGL/ \
		${JS_SOURCES}

flags:
	echo $(COMPILER_ARGUMENTS) > release.flags
	echo "--externs deps.js" >> release.flags
	echo "--compilation_level $(COMPILE_LEVEL_DEBUG)" >> release.flags
	echo "--create_source_map=$(OUTPUT_DIR)/$(OUTPUT_FILE).map" >> release.flags

debug_flags:
	echo $(COMPILER_ARGUMENTS) > debug.flags
	echo "--externs deps.js" >> debug.flags
	echo "--compilation_level $(COMPILE_LEVEL_DEBUG)" >> debug.flags
	echo "--formatting PRETTY_PRINT" >> debug.flags
	echo "-D ENABLE_DEBUG=1" >> debug.flags
	echo "--create_source_map=$(OUTPUT_DIR)/$(OUTPUT_FILE).map" >> debug.flags
	echo "--source_map_format=V3" >> debug.flags

debug: debug_flags
	${CLOSURE_LIBRARY}/closure/bin/build/closurebuilder.py --root ${CLOSURE_LIBRARY}  \
		--output_mode=compiled \
		--output_file=$(OUTPUT_DIR)/$(OUTPUT_FILE) \
		--compiler_jar=$(CLOSURE_HOME)/$(CLOSURE_JAR) \
		--root=chesterGL/ \
		--compiler_flags="--flagfile=debug.flags" \
		${JS_SOURCES}
	# adds source map support!
	echo "//@ sourceMappingURL=chester.js.map" >> $(OUTPUT_DIR)/$(OUTPUT_FILE)
	cp html/chester.js html/scripts/chester.js

release: compile
	mkdir -p release
	cat LICENSE > release/chester.min.js
	cat html/chester.js >> release/chester.min.js
	cp README.md release/README.md
	zip -r chesterGL-latest.zip release
	mv chesterGL-latest.zip html/

# just cat everything into chester.js (when debugging is getting hard)
debug-plain:
	cat ${SOURCES} > $(OUTPUT_DIR)/$(OUTPUT_FILE)

clean:
	rm -f "$(OUTPUT_DIR)/$(OUTPUT_FILE)" "$(OUTPUT_DIR)/$(OUTPUT_FILE).map"

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
