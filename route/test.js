const _ = require('lodash')
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter')

dayjs.extend(customParseFormat) // use plugin
dayjs.extend(isSameOrAfter) // use plugin


const multerFilenamePostfixMap = {}

multerFilenamePostfixMap['230123-1551-ddd'] = true
function multerCleanPostfixMap() {
	function isPast(str)
	{
		str = `${str.split('-')[0]}-${str.split('-')[1]}`
		return dayjs().isSameOrAfter(dayjs(str, 'YYMMDD-HHmm').add(1, 'm'))
	}
	for(const filename in multerFilenamePostfixMap)
		if(isPast(filename))
			delete multerFilenamePostfixMap[filename]
}

multerCleanPostfixMap()
console.log(multerFilenamePostfixMap)