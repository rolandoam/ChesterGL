# compile.py
# - Version: 1.0
# - Replacement for the Makefile. This is cross-platform.
# - Requires Python 2.7+
import sys, argparse, subprocess, urllib2

externs = ['jquery-1.7.js', 'webkit_console.js', 'google_analytics_api.js', 'json.js']
src = ['chesterGL/core.js', 'chesterGL/block.js', 'chesterGL/blockFrames.js', 'chesterGL/blockGroup.js', 'chesterGL/actions.js', 'chesterGL/tmxBlock.js', 'chesterGL/GPUParticleSystem.js', 'chesterGL/primitivesBlock.js', 'chesterGL/labelBlock.js', 'chesterGL/bmFontLabelBlock.js']

parser = argparse.ArgumentParser(description='Compiler for ChesterGL')

group1 = parser.add_argument_group('Compile Options')
group1.add_argument('-mode', action='store', choices=['debug', 'release'], default='release', help='Set the flags for debug or release.')
group1.add_argument('-fetch', '-f', action='store_true', default=True, help='Fetch externs.')
group1.add_argument('-docs', action='store_true', help='Build documents using JSDoc.')
group1.add_argument('-output', '-o', action='store', default='./html', help='Output directory.')


group2 = parser.add_argument_group('Dependency Options')
group2.add_argument('-python', action='store', default='python', help='Location of python executable.')
group2.add_argument('-java', action='store', default='java', help='Location of java.')
group2.add_argument('-jsdoc', action='store', default='/Applications/jsdoc-toolkit', help='Location of JSDoc root directory.')
group2.add_argument('-ccompiler', action='store', default='/Applications/closure-compiler', help='Path to closure compiler folder.')
group2.add_argument('-clib', action='store', default='/Applications/closure-library', help='Path to closure library folder.')
group2.add_argument('-cjar', action='store', default='compiler.jar', help='Filename to closure compiler jar.')

args = parser.parse_args()

externsTmp = ''
for ext in externs:
    externsTmp += '--externs ' + args.ccompiler +'/' + ext + ' '
compilerArgs = externsTmp + '--language_in=ECMASCRIPT5_STRICT --warning_level=VERBOSE --jscomp_warning=checkTypes --summary_detail_level=3 '

def dload(file, output):
    response = urllib2.urlopen(file)
    html = response.read()
    o = open(output, 'w+')
    o.write(html)
    o.close()
    return

# Fetch externs?
if args.fetch:
    for file in externs:
        dload('http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/' + file, args.ccompiler + '/' + file)
        print 'Downloaded: ' + file

# Write the flag files for compiling
flags = ''
flagFile = open(args.mode + '.flags', 'w+')
if args.mode == 'release': # Release flags
    flags += compilerArgs
    flags += '--externs deps.js '
    flags += '--compilation_level ADVANCED_OPTIMIZATIONS '
    flags += '--create_source_map=' + args.output +'/chester.js.map '
else: # Debug flags
    flags += compilerArgs
    flags += '--externs deps.js '
    flags += '--compilation_level ADVANCED_OPTIMIZATIONS '
    flags += '--formatting PRETTY_PRINT '
    flags += '-D ENABLE_DEBUG=1 '
    flags += '--create_source_map=' + args.output +'/chester.js.map '
    flags += '--source_map_format=V3'
flagFile.write(flags)
flagFile.close()

# Compile 
compileArgs = args.python + ' '
compileArgs += args.clib + '/closure/bin/build/closurebuilder.py '
compileArgs += '--root ' + args.clib + ' '
compileArgs += '--output_mode=compiled '
compileArgs += '--output_file=' + args.output + '/chester.js '
compileArgs += '--compiler_jar=' + args.ccompiler + '/' + args.cjar + ' '
compileArgs += '--root=chesterGL/ '
if args.mode == 'release':
    compileArgs += '--compiler_flags="--flagfile=release.flags" '
else:
    compileArgs += '--compiler_flags="--flagfile=debug.flags" '

for file in src:
    compileArgs += '-i ' + file + ' '

if subprocess.call(compileArgs, shell=True) != 0:
    print '================================'
    print 'We had an error during the compile process.'
    sys.exit()

# If debug, add source mapping comment to compiled file.
if args.mode == 'debug':
    jsFile = open(args.output + '/chester.js', 'a+')
    jsFile.write('//@ sourceMappingURL=chester.js.map');
    jsFile.close()

# Generate doc?
if args.docs:
    docs = args.java + ' '
    docs += '-jar ' + args.jsdoc + '/jsrun.jar ' + args.jsdoc + '/app/run.js -w -version 170 -v -a '
    docs += '-t=' + args.jsdoc + '/templates/jsdoc ' 
    src.insert(0, 'chesterGL/docs.js')
    for file in src:
        docs += file + ' '
    docs += '-d=' + args.output + '/docs'
    if subprocess.call(docs, shell=True) != 0:
        print '================================'
        print 'We had an error during the compile process.'
        sys.exit()

print '================================'
print 'Completed.'