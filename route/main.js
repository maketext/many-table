/**
 * @version 0.1
 * @copyright Many Stallings Company 2023
 * @license MIT
 */

//process.env.NODE_ENV = 'production'

const express = require('express')
const app = express()
const session = require('express-session')
const compression = require('compression')
const axios = require('axios')
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs')
const cookieParser = require('cookie-parser')
const querystring = require('querystring')
const cors = require('cors')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const { Level } = require('level')
const flash = require('flash')
const _ = require('lodash')
const randomString = require("randomstring")
const { toInteger, cond } = require('lodash')
const MobileDetect = require('mobile-detect')

const multer = require('multer') // express에 multer모듈 적용 (for 파일업로드)
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter')
const { generate } = require('randomstring')
const { URL } = require('url')

dayjs.extend(customParseFormat) // use plugin
dayjs.extend(isSameOrAfter) // use plugin
// Create a database
const db = new Level('many', { valueEncoding: 'json' })

let baseURL = '127.0.0.1'
const port = 8888

//const maxId = {'테이블1': 100} // 임시 Temporary
const maxId = {}
const envMap = {
	'직원명부': '직원 명부'
}

/**
 * @function 
 * @param {string|decimal} str - Alias for console.log. 콘솔 로그 별칭.
 */
function log(str)
{
	//console.log(str)
}

/**
 * @function
 * @param {int} id -  (1,) demension index value. (1,) 차원의 인덱스 값.
 * @returns {int} (2,) demension index value. first element is 10,000 unit value and second element is remainder. (2,) 차원의 인덱스 값. 첫 엘리먼트는 10,000 단위 값이고 두 번째 엘리먼트는 10,000으로 나눈 나머지.
 */
function getIndex(id) {
	id = toInteger(id)
	if(id < 0) return undefined
	const tableIndex = toInteger(id / 10000)
	return [tableIndex, id - tableIndex * 10000]
}

/**
 * @function
 * @param {int} len - RandomString length. When it's value is undefined, it sets default value 32. 랜덤 문자열 길이. 그 값이 undefined일 경우 기본값 32로 설정.
 * @returns {string} 
 */
function uniqueGenerate(len) {
	try {
		if(len === undefined) len = 32
		while(true)
		{
			const token = randomString.generate({length: len, charset: 'alphabetic'})
			if(tokenMap[token] === undefined) return token
		}
	} catch(e){
	}
	return undefined
}

/**
 * @function
 * @param {string} cmd - Command string alias for message select. 메시지 선택을 위한 명령 문자열.
 * @returns {object} {code:int, msg:string} object return. {code:int, msg:string} 오브젝트 리턴.
 */
function getMessage(cmd) {
	switch(cmd)
	{
		case '일반오류':
			return {code:1001, msg: '일반 오류가 발생하였습니다.'}
		case '없음':
			return {code:1002, msg: '데이터가 없습니다.'}
		case '읽기오류':
			return {code:1003, msg: '데이터베이스 읽기 오류가 발생하였습니다.'}
		case '쓰기오류':
			return {code:1004, msg: '데이터베이스 쓰기 오류가 발생하였습니다.'}

		case '로그인성공':
			return {code:2001, msg: '로그인에 성공하였습니다.'}
		case '로그인실패':
			return {code:2002, msg: '로그인에 실패하였습니다.'}
		case '권한없음':
			return {code:2003, msg: '접근 권한이 없습니다.'}
		case '권한있음':
			return {code:2004, msg: '접근 권한이 있습니다.'}
		
	}
	//기타
	return {code:9999, msg: '기타 에러가 발생하였습니다.'}
}

const multerFilenamePrefixMap = {}
const filenameToTokenMap = {}
const tokenToFilenameMap = {}
const tokenMap = {}

/**
 * @function
 * If it uploads a file as a same file name at the same time, we want to manage it with a unique original file name.
 * Creates a prefix of the file name that applies to the file upload module, multer. For example, when you upload three consecutive identical files on February 8, 2023, at 21:56,
 * return the prefix "1-230208-2156", "2-230208-2156", and "3-230208-2156" in order.
 * 
 * 같은 파일 이름을 가진 파일을 동시에 업로드 할 경우, 중복하지 않는 원본 파일 이름으로 관리하려고 합니다.
 * multer 파일 업로드 모듈에 적용되는 파일이름의 접두어를 생성합니다. 2023년 02월 08일 21시 56분에 연속해서 3개의 같은 파일을 업로드 했을 때,
 * 차례로 '1-230208-2156', '2-230208-2156', '3-230208-2156' 접두어를 리턴합니다.
 * @param {string} filename - original file name read from multer file upload module. multer 파일 업로드 모듈에서 읽어들인 원본 파일 이름.
 * @returns Non-duplicated prefix string. 중복하지 않은 접두어 문자열.
 */
function multerFilenamePreFix(filename) {
	if(!_.has(multerFilenamePrefixMap, filename))
		multerFilenamePrefixMap[filename] = [`0-${dayjs().format('YYMMDD-HHmm')}`]
	const a = multerFilenamePrefixMap[filename]
	if(!Array.isArray(a))
		multerFilenamePrefixMap[filename] = [`0-${dayjs().format('YYMMDD-HHmm')}`]
	let lastElement = _.last(a)
	
	a.push(`${_.toInteger(_.head(lastElement.split('-'))) + 1}-${_.tail(lastElement.split('-')).join('-')}`)
	return `${_.toInteger(_.head(lastElement.split('-'))) + 1}-${_.tail(lastElement.split('-')).join('-')}`
}

/**
 * @function
 * Clean the file name prefix map data structure.
 * Erase all key data in the form n-YYYMMDD-HHmm, meaning a value one minute before the current time and before that value, at which the function is called. 
 * 
 * 파일 이름 접두어 맵 자료구조를 클린합니다. 키는 n-YYMMDD-HHmm 형태로 함수가 호출되는 현재 시각 보다 1분 전과 그 이전 값을 의미하는 키 데이터들을 전부 삭제합니다.
 * @returns 없음 None
 */
function multerCleanPrefixMap() {
	function isPast(str)
	{
		str = `${str.split('-')[1]}-${str.split('-')[2]}`
		return dayjs().isSameOrAfter(dayjs(str, 'YYMMDD-HHmm').add(1, 'm'))
	}
	for(const filename in multerFilenamePrefixMap)
		if(isPast(_.last(filename)))
			delete multerFilenamePrefixMap[filename]
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		multerCleanPrefixMap()
		if(file.fieldname == 'userfile')
			cb(null, '../res/files') // Set saving storage directory of file sent through cb callback function. cb 콜백함수를 통해 전송된 파일 저장 디렉토리 설정.
	},
	filename: function (req, file, cb) {
		file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
		console.log('file.originalname', file.originalname)
		file.originalname = `${multerFilenamePreFix(file.originalname)}-${file.originalname}`
		
		if(_.random(10) === 0) multerCleanPrefixMap()
		console.log('multerFilenamePrefixMap', multerFilenamePrefixMap)

		let filenameToken = uniqueGenerate(16)
		if(filenameToken === undefined) filenameToken = file.originalname

		filenameToTokenMap[file.originalname] = filenameToken
		tokenToFilenameMap[filenameToken] = file.originalname
		
		/*
		let genFilename = ''
		for(let e of [1,2,3])
		{
			genFilename = randomString.generate()
			const resultCode = updateSomeIfNot('files', genFilename, file.originalname)
			if(resultCode !== undefined) break
			else genFilename = 'undefined'
		}*/
		//JSON.parse(req.files.row)
		//JSON.parse(req.files.field)
		cb(null, file.originalname)
		//cb(new Error("임시"))
		/*
		findSome(`table-${req.files.tableName}`)
			.then(table => {
				req.body.row[req.body.column] = genFilename
				readReplaceDeleteTableOne('PUT', table, req.body.row)
				saveSome(`table-${req.body.tableName}`, table)
					.then(() => cb(null, file.originalname))
			})*/
	}
})
const upload = multer({
	storage: storage,
	fileFilter: function (req, file, callback) {
		callback(null, true)
		return
		console.log('file', file)
		if((/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(path.extname(file.originalname)))
		{
			callback(null, true)
		}
		else
			return callback(new Error('오직 이미지 파일만 업로드 됩니다.'))
    },	
	limits: { fieldSize: 1024 * 1024 * 1024 } 
})

/**
 * Return whether the current session is authorized
 * 
 * 현재 세션이 인가되었는지 여부를 리턴 
 * @function
 * @param {import('express').Request} req - Express.js Request Object. Express.js 요청 객체.
 * @returns True when the current user is logged out, false when logged in. 현재 유저가 로그아웃 상태 시 true, 로그인 시 false.
 */
function hasNotUser(req) {

	const returnValue = []
	if(!_.has(req, "isUnauthenticated"))
		returnValue.push(true)
	if(typeof req.isUnauthenticated !== 'function')
		returnValue.push(true)
	else if(req.isUnauthenticated())
		returnValue.push(true)
	if(returnValue.join().includes('true'))
	{
		// 로그아웃 상태
		return true
	}
	// 로그인 상태
	return false
}

/**
 * If the JavaScript expression of the ifTrue parameter value is true, issue a Remember Me token.
 * The format of the token value is 'MMS' + YYMMDD + ('20'|'1d'|'un') + randomString.
 * Draft: It is true that Semantic information remains within the Remember Me token value. So implement the logic converting to JWT tokens
 * 
 * ifTrue 파라미터 값의 자바스크립트 표현식이 true이면 리멤버 미 토큰을 발행한다. 토큰 값의 포멧은 'MMS' + YYMMDD + ('20'|'1d'|'un') + randomString 이다.
 * 초안 : 리멤버 미 토큰 값 내에 시멘틱 정보가 남아 있어 JWT 토큰으로 변환하는 로직 구현
 * @function
 * @param {boolean} ifTrue - Whether to issue a token is issued. 토큰 발행 여부.
 * @param {import('express').Request} req - Express.js Request Object. Express.js 요청 객체.
 * @param {import('express').Response} res - Express.js Response Object. Express.js 응답 객체.
 * @param {import('express').NextFunction} next - Express.js next function value. Express.js next 함수값.
 * @returns None. 없음.
 */
function issueTokenWhen(ifTrue, req, res, next) {
	if(ifTrue)
	{
		console.log("// 리멤버미 토큰 발행")
		let endDate
		if(req.body.remember_me === 'un') endDate = 'un'
		else endDate = '--'

		const token = `MMS${dayjs().format('YYMMDDHHmmss')}${endDate}${randomString.generate()}`
		saveRememberMeToken(token, req.user.username)
			.then(() => {
				res.cookie('remember_me', token, { path: '/', maxAge: 8640000000 })
			})
			.finally(() => next())
		return
	}
	next()
}

/**
 * Reissue the Remember Me token according to the cookie value.
 * If the value of the remember_me cookie does not exist, or if validation has failed (junk RememberMe), or if an already authorized session is alive, then the current function is ignored.
 * 
 * 쿠키 값에 따라 리멤버 미 토큰을 재발행한다. remember_me 쿠키 값이 없거나 유효성 검증에 실패한 경우 (정크 리멤버 미) 또는 이미 인가된 세션이 살아 있는 경우는 현재 함수를 무시한다.
 * @async
 * @function
 * @param {import('express').Request} req - Express.js Request Object. Express.js 요청 객체.
 * @param {import('express').Response} res - Express.js Response Object. Express.js 응답 객체.
 * @param {import('express').NextFunction} next - Express.js next function value. Express.js next 함수값.
 * @returns 없음
 */
async function loginWithRememberMe(req, res, next) {
	function authRememberMeToken(token) {
		const dateNumber = _.toInteger(token.substring(3, 15))
		const endDate = token.substring(15, 25) ? token.substring(15, 25) : '' 
		////console.log(dayjs(dateNumber.toString(), 'YYMMDD').startOf('d'))
		////console.log(dayjs(new Date(2023, 0, 30)).startOf('d'))
		if(token.startsWith('MMS'))
			if(!isNaN(dateNumber))
				if(dateNumber > 200000000000 && dateNumber <= 999999999999)
					if(dayjs(dateNumber.toString(), 'YYMMDD').startOf('d').isSameOrAfter(dayjs(new Date(2023, 0, 30)).startOf('d')))
					{
						if(endDate.startsWith('un')) return dayjs(dateNumber.toString(), 'YYMMDDHHmmss').add(100, 'd').isSameOrAfter(dayjs())
					}
		return false
	}
	async function getUserFromRememberMeToken() {
		// There is no Remember Me Cookie Value. 리멤버미 쿠기값 없음.
		if(!req.cookies.remember_me) return undefined
		// When Cookie validation fails... 쿠키 유효성 검사 실패시...
		if(!authRememberMeToken(req.cookies.remember_me)) return undefined
		const username = await consumeRememberMeToken(req.cookies.remember_me)
		console.log("// 리멤버미 소비")
		// If you return undefiend, it is junk reminder me. undefiend를 리턴할 경우 정크 리멤버미이다.
		return await findSomeBySome('user', username)
	}
	console.log("hasNotUser(req)", hasNotUser(req))
	console.log("req.isAuth=", req.isAuthenticated())
	if(!hasNotUser(req)) return next() // Case of session already logged in, ignore the current function.	이미 로그인 한 세션의 경우 현 함수를 무시한다.
	let user = await getUserFromRememberMeToken()
	console.log('user', user)
	if(!_.isNil(user))
	{
		console.log("//재로그인 작업 수행")
		req.login(user, function(err) {
			if (err) next(err)
			else
			{
				// Renew Remember Me Token. 리멤버미 토큰 갱신.
				issueTokenWhen(req.cookies.remember_me === 'un', req, res, next)
				req.user.remember_me = req.cookies.remember_me
			}
		})
	}
	else next()  //Junk Remember Me or No Remember Me Cookie Value.	정크 리멤버 미 또는 리멤버 미 쿠기값 없음.
}

/*
const corsObject = {origin: function(url, cb) {
	if(url)
		if(url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('http://plusuniv.com'))
		{
			cb(null, true)
			return
		}
	if(!url)
		cb(null, true)
	else
		cb(new Error(`target url=${url} is filtered by origin callback.`))
}}
app.use(cors(corsObject))
*/

const secretList = ['ad6e89cc744a5fa5a23e3d9a4f07e999', '60393f2bcf92a4f87f1ddf6289b331cb', '12982ef42691544736f28d204aa0644d', 'd61752f13a4dc72c45e5c6f45fc0788d', 'dd1568dcb3ee3217ab0ca6664eff09bc', '6be01056887af61b8c8f00ae5a72f01a']
const activeUsers = {count: 0}
app.use(compression()) // Removed when using nginx because it can be controlled by reverse proxy. 역방향 프록시에서 제어가능하므로 nginx 사용시 제거.
app.use(express.static(path.join(__dirname, '..', 'res')))
app.use(cookieParser()); // Required when using passport-remember-me and corresponds to "Cannot read properties of undefined (reading 'remember_me') error. "Cannot read properties of undefined (reading 'remember_me')" 에러에 대응하며 passport-remember-me 사용시 필수.
app.use(bodyParser.urlencoded({ extended: true })) // Important when sending form! form 양식 전송시 중요!
app.use(bodyParser.json())
app.use(session({
  secret: secretList,
  resave: false,
  saveUninitialized: false,
  cookie: { path: '/' }
}))
app.use(flash())
app.use((req, res, next) => {
	//res.locals.flash = []

	log(`새 라우팅 ${req.path}`)

	res.on("finish", function() {
		log("응답메시지 전송됨.")
	})
	// Where to typing Serialization/Deserialization, components for caching verification. 직렬화/역직렬화, 캐싱확인용 컴포넌트 들어갈 자리.
	res.append('Cache-Control', 'max-age=5')
	next()
})
app.use(passport.initialize())
app.use(passport.session())

//User information for testing. 테스트용 유저 정보.
db.put('user', {
	admin2: {username: 'admin2', name: '애덤', password: 'apple111apple111', remember_me: false, permission: {}}
}).then(() => {
	}).catch(error => {
	})
	

// Login Validation Strategy. 로그인 검증 전략.
passport.use(new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password'
}, (username, password, cb) => {
	findSomeBySome('user', username)
		.then(user => {
			if(user)
				if(user.password === password)
					return cb(null, user)
			cb(null, false, { message: '유저네임이 일치하지 않습니다.' })
		})
		.catch(err => {
			console.log("로컬전략 읽기 오류")
			cb(err)
		})


	/*
	crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', function(err, hashedPassword) {
		if (err) { return cb(err); }
		if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
			return cb(null, false, { message: 'Incorrect username or password.' });
		}
		;
	})*/

}));

/**
 * Read and delete Remember Me token (consumption)
 * 
 * 리멤버 미 토큰 읽고 삭제 (소비)
 * @async
 * @function
 * @param {string} tokenKey - Remember Me Token Value. 리멤버 미 토큰 값.
 * @returns 없음 None
 */
async function consumeRememberMeToken(tokenKey) {
	
	try {
		const tokenValue = await db.get(`rememberme-${tokenKey}`)
		await db.del(`readme-${tokenKey}`)
		console.log("// 리멤버미 소비 성공")
		return tokenValue
	} catch (e) {
		console.log("// 리멤버미 소비 실패", e.message)
	}
  return {username: undefined}
}

/**
 * Persistently save the information pair of (Remember Me token, username).
 * 
 * (리멤버 미 토큰, username) 쌍 정보를 영구 저장한다.
 * @async
 * @function
 * @param {string} tokenKey - Remember Me Token Value. 리멤버 미 토큰 값.
 * @param {string} tokenValue - username value. username 값.
 */
async function saveRememberMeToken(tokenKey, tokenValue) {
  await db.put(`rememberme-${tokenKey}`, tokenValue)
}

/**
 * Find information (Remember Me token, username) by inputting the Remember Me token value.
 * 
 * 리멤버 미 토큰 값으로 (리멤버 미 토큰, username) 정보를 찾는다.
 * @async
 * @function
 * @param {string} tokenKey 
 */
async function findRememberMeToken(tokenKey) {
  await db.get(`rememberme-${tokenKey}`)
}

async function findSome(some) {
	try {
		return await db.get(some)
	} catch(e) {
		return undefined
	}
}
async function findSomeBySome(some1, some2) {
	if(_.isNil(some2)) return undefined
	const some = await db.get(some1)
	return some[some2]
}
async function querySome(table, tableName, query, condition)
{
	let cnt, result = []
	let len = Object.keys(query).length

	// Object Cleaning. 오브젝트 클리닝.
	_.forOwn(query, (value, key) => {
		if(value === '' || _.isNil(value)) delete query[key]
	})

	if(_.isNil(condition)) condition = '또는 포함'
	if(_.isNil(maxId[tableName])) return result

	switch(condition)
	{
		case '그리고 포함':
		case '또는 포함':
		{
			for(let id = 0; id <= maxId[tableName]; id++)
			{
				const ab = getIndex(id)
				if(ab === undefined) continue
				const [a, b] = ab
				//console.log('table', tableName)
				//console.log('maxId', maxId[tableName])
				//console.log('table', table)
				//console.log(a, b)
				const row = table[a][b]
				cnt = 0
				if(_.isNil(row)) continue
				_.forOwn(query, function(value, key) {
					if(_.isNil(row[key])) return
					if(row[key].toString().includes(value))
						cnt++
				})
				delete row['null']
				if(condition == '그리고 포함' && cnt === len)
					result.push(row)
				else if(condition == '또는 포함' && cnt > 0)
					result.push(row)
				else if(condition == '또는 포함' && len === 0)
					result.push(row)
			}
			break
		}
	}
	return result
}
async function saveSome(key, value) {
	console.log('세이브')
	//console.log(key, value)
	return await db.put(key, value)
}
async function createIfNot(key, value) {
	try {
		await db.get(key)
		return true
	} catch(e) {
		return await db.put(key, value)
	}
}
async function replaceColumnOne(tableName, row, field, value)
{
	const table = await findSome(`table-${tableName}`)
	console.log('row.id', row.id)
	const [tableIndex, rowIndex] = getIndex(row.id)
	console.log([tableIndex, rowIndex])
	console.log(field)
	console.log(value)
	table[tableIndex][rowIndex][field] = value
	await saveSome(`table-${tableName}`, table)
}


passport.serializeUser(function(user, cb) {
	return cb(null, user.username);
})

passport.deserializeUser(function(username, cb) {
	findSomeBySome('user', username)
		.then(user => cb(null, user))
		.catch(err => cb(err))
})

/*
app.post('/login', passport.authenticate('local', function (a, b, c, d) {
	//err, user, info, status
	//로그인 실패시 null false { message: 'Missing credentials' }

	console.log(a, b, c)
}))*/

// 에러 페이지 처리
app.get(['/many-table/error'], (req, res, next) => {
	if(hasNotUser(req))
		res.render('many-table/error', {code: 401, message:'권한이 없습니다.'})
	else
		res.render('many-table/error', {code: 404, message:'페이지가 없습니다.'})
})
app.all('/many-table/login', loginWithRememberMe, async (req, res, next) => {
	
	if(hasNotUser(req))
		next()
	else
		res.redirect('/many-table/front')
})

// Static page. 스테틱 페이지.
app.get(['/many-table/report', '/many-table/letter', '/many-table/login', '/many-table/sign-up-begin', '/many-table/testing/json', '/many-table/testing/help', '/many-table/sign-up-promise', '/many-table/sign-up', '/many-table/sign-up-end'], (req, res, next) => {
	console.log('res.locals.flash', res.locals.flash)
	if(req.path === '/many-table/report')
		res.render(req.path.substring(1), {message: res.locals.flash.length > 0 ? res.locals.flash[0].message : '', tableName: Buffer.from(JSON.stringify(['거래명세표', '견적서', '근로계약서']), "utf8").toString('base64url')})
	else
		res.render(req.path.substring(1), {message: res.locals.flash.length > 0 ? res.locals.flash[0].message : ''})
	res.locals.canRendered = 1
})

// Starts to the login only page. 로그인 전용 페이지 시작.
// Cross-cutting Concern to verify login. 로그인 여부 확인용 횡단 관심사.
app.get(['/many-table/front', '/many-table/new-table', '/many-table/permission', '/many-table/whatisit'], (req, res, next) => {
	if(hasNotUser(req))
		res.redirect('/many-table/error')
	else
		next()
})
// Login-only page routing. 로그인 전용 페이지 라우팅.
app.get(['/many-table/sign'], (req, res, next) => {
	//Example of a req.user object {username: 'admin2', name: '관리자', password: 'apple111apple111', remember_me: false, permission: {}}
	//req.user 객체 예시 {username: 'admin2', name: '관리자', password: 'apple111apple111', remember_me: false, permission: {}}
	res.render(req.url.substr(1), {username: req.user.username, name: req.user.name, tableName: Buffer.from(JSON.stringify({'결제': '결제', '직원명부': '직원명부'}), "utf8").toString('base64url')})
	
})
app.get(['/many-table/new-table', '/many-table/permission', '/many-table/whatisit'], (req, res, next) => {
	
	if(res.locals.flash.length > 0)
		res.render(req.url.substr(1), {type: res.locals.flash[0].type, message: res.locals.flash[0].message})
	else
		res.render(req.url.substr(1), {type: '', message: ''})
	res.locals.canRendered = 1
})
app.get('/many-table/front', async (req, res, next) => {
	async function sendAsync(req, res) {
		let user = await findSomeBySome('user', req.user.username)
		if(_.isNil(user)) user = {}
		else
		{
			delete user.name
			delete user.password
		}
		return user
	}

	try {
		const user = await sendAsync(req)
		res.render('many-table/front', {user: JSON.stringify(user)})
		res.locals.canRendered = 1
	} catch(err) {
		res.send(getMessage('읽기오류'))
	} finally {
	}
})
// 끝
// End


/* for Test. 테스트 용.
app.get(['/many-table/testing/chart'], (req, res, next) => {
	res.render(req.url.substr(1))
	res.locals.canRendered = 1
	next()
})
app.get(['/many-table/testing/rowlog'], (req, res, next) => {
	if(hasNotUser(req))
		res.redirect('/many-table/error')
	else
		res.render(req.url.substr(1), {user: req.user.username})
	res.locals.canRendered = 1
	next()
})*/

// Routing the Many Stallings Company's official website. 회사 공식 홈페이지 라우팅.
app.get(['/'], (req, res, next) => {
	let md = new MobileDetect(req.headers['user-agent']);
	res.setHeader('Page-Type', 'text/html')
	if(md.mobile())
		res.render('corpM', {axiosAddr: baseURL})
	else
		res.render('corp', {axiosAddr: baseURL})
	res.locals.canRendered = 1
})
app.get(['/license'], (req, res, next) => {
	res.render('license', {})
	res.locals.canRendered = 1
})
app.get(['/example/dev1'], (req, res, next) => {
	res.render('dev/dev1', {})
	res.locals.canRendered = 1
})
app.get(['/terms/wordnote'], (req, res, next) => {
	res.render('terms/wordnote', {})
	res.locals.canRendered = 1
})
// Home page routing ends
// 홈페이지 라우팅 끝



app.post('/many-table/login',
	passport.authenticate('local', {
	failureFlash: getMessage('로그인실패').msg,
	failureRedirect: '/many-table/login'
}), (req, res, next) => {
	req.user.remember_me = req.body.remember_me
	//console.log(req.body)
	issueTokenWhen(req.body.remember_me === 'un', req, res, next)
}, (req, res) => {
	app.emit('event:user_login')
	res.redirect('/many-table/front')
})
app.all('/many-table/logout', async (req, res, next) => {
	await consumeRememberMeToken(req.cookies.remember_me)
	res.clearCookie('remember_me')
	req.logout(err => {
    if (err) 
			next(err)
		else
		{
			res.send({code: 0})
			next()
		}
	})
})
app.on('event:user_login', () => {
	console.log("세션 로그인", ++activeUsers.count)
})

app.listen(port, async () => {
	log("HTTP 네트워크 소켓 리스닝 중...")

	const tableNameList = Object.keys(await findSome('columns'))
	for(const tableName of tableNameList)
	{
		//console.log(_.last(_.last(await findSome(`table-${tableName}`))))
		const lastElement = _.last(_.last(await findSome(`table-${tableName}`)))
		maxId[tableName] = toInteger(lastElement ? lastElement.id : 0) 
	}
	console.log(maxId)

})

app.set('view engine', 'pug')
app.set('views', path.join(__dirname,'..', 'pug'))

function getCount(id) {
	return id / 5000 + 1
}
function getMaxId() {

}

// Evaluate whether or not a user is logged in and having permissions. 유저 로그인 여부 및 권한 평가.
app.all('/api/v2*', loginWithRememberMe, async (req, res, next) => {
	if(hasNotUser(req))
		res.status(404).send('응답이 없습니다.')
	else
	{
		if(!_.has(req.body, 'tableName')) return next()
		try {
			const user = await findSomeBySome('user', req.user.username)
			if(req.url == '/api/v2/table-list' && req.isAuthenticated()) return next()
			if(!user.permission[req.body.tableName])
			{
				res.status(400).send(getMessage('권한없음'))
				console.log(getMessage('권한없음'))
				return
			}
			console.log(getMessage('권한있음'))
		} catch(e) {
			res.status(400).send(getMessage('권한없음'))
			console.log(getMessage('권한없음'))
			return
		}
		next()
	}
})

function transactionTableRowOne(cmd, table, row) {
	const [tableIndex, rowIndex] = getIndex(row.id)
	console.log([tableIndex, rowIndex])

	switch(cmd)
	{
		case '읽기':
		{
			try {
				return table[tableIndex][rowIndex]
			} catch {
				return undefined
			}
		}
		case '대체':
		{
			console.log("대체됬나", table[tableIndex][rowIndex])
			console.log("로우", row)
			if(table[tableIndex][rowIndex])
				table[tableIndex][rowIndex] = row
			console.log("대체됬나", table[tableIndex][rowIndex])
			break
		}
		case '삭제':
		{
			table[tableIndex][rowIndex] = undefined
			break
		}
	}
	return true
}
function saveTableOne(table, row) {
	function AI() {
		let partitionIndex = table[table.length - 1].length
		if(partitionIndex > 9999)
		{
			partitionIndex = 0
			table.push([])
		}
		row.id = partitionIndex
	}
	if(!Array.isArray(table)) table = [[]]

	AI()
	table[table.length - 1].push(row)
	return [table, (table.length - 1) * 10000 + row.id]
}

/**
 * Add Table Row
 * 
 * 테이블 로우 추가
 * @event
 * @param {METHOD} method - POST
 * @param {URL} url - /api/v2
 */
app.post('/api/v2/', async (req, res, next) => {
	if(!req.body.hasOwnProperty('tableName')) next()
	if(!req.body.hasOwnProperty('row')) next()

	delete req.body.row['null']
	//console.log('req.body', req.body)
	try {
		let table = await findSome(`table-${req.body.tableName}`)
		const [table2, insertId] = saveTableOne(table, req.body.row)
		await saveSome(`table-${req.body.tableName}`, table2)
		maxId[req.body.tableName] = insertId
		res.send({code: 0, insertId: insertId})
	} catch(e) {
		console.log(e)
		res.send(getMessage('쓰기오류'))
	}
	next()
})

/**
 * Table low lookup (PATCH), modification (PUT), deletion (DELETE)
 * 
 * 테이블 로우 조회(PATCH), 수정(PUT), 삭제(DELETE)
 * @event
 * @param {METHOD} method - ALL METHOD (PATCH, PUT, DELETE)
 * @param {URL} url - /api/v2
 * @param {RequestBody} tableName - string - 테이블 이름 (PATCH, PUT only). Table Name (PATCH, PUT only).
 * @param {RequestBody} condition - string - '그리고 포함', '또는 포함' (PATCH only). "And include", "or include" (PATCH only).
 * @param {RequestBody} query - JSONObject - 조건 검색 쿼리 (PATCH only). Query of searching (PATCH only).
 * @param {RequestBody} row - JSONObject - 수정할 로우 객체 (PUT only). Row object to modify (PUT only).
 * @param {Querystring} a - string - 테이블 이름 (DELETE only). Table Name (DELETE only).
 * @param {Querystring} b - string - 로우 id 값 (DELETE only). Low id value (DELETE only).
 */
app.all('/api/v2/', async (req, res, next) => {
	console.log('METHOD', req.method)
	if(!(req.method == 'PATCH' || req.method == 'PUT' || req.method == 'DELETE')) return next()


	// Programming lookup functioning. 조회 기능 프로그래밍
	try {
		const table = await findSome(`table-${req.body.tableName ? req.body.tableName : req.query.a}`)
		//console.log('table', table)
		if(table === undefined)
		{
			// The table is empty. Empty when table is new. 테이블이 비었습니다. 테이블 신규시 비어있음.
			res.send({code: 1, result: '테이블이 비었습니다.'})
			next()
			return
		}
		let result = []
		switch(req.method)
		{
			case 'PATCH':
			{
				if(_.has(req.body, 'query')) // Search for conditions. 조건 검색.
					result = await querySome(table, req.body.tableName, req.body.query, req.body.condition)
				else // Search for ID. ID 검색.
					req.body.rowIds.forEach(id => {
						const row = transactionTableRowOne('읽기', table, {id: id})
						delete row['null']
						if(!_.isNil(row)) result.push(row)
					})
				//console.log('result', result)
				res.send({code: 0, result: result})
				break
			}
			case 'PUT': // modification. 수정.
			{
				delete req.body.row['null']
				console.log('대체할 로우', req.body.row)
				transactionTableRowOne('대체', table, req.body.row)
				await saveSome(`table-${req.body.tableName}`, table)
				res.send({code: 0})
				break
			}
			case 'DELETE':
			{
				transactionTableRowOne('삭제', table, {id: req.query.b})
				await saveSome(`table-${req.query.a}`, table)
				res.send({code: 0})
				break
			}
		}
	} catch(e) {
		console.log(e)
		if(req.method == 'PATCH')
			res.send(getMessage('읽기오류'))
		else
			res.send(getMessage('쓰기오류'))

	}
	next()
})

/**
 * Write a table list.
 * Persistent saving of the entire table list object reflecting the modifications as input.
 * 
 * 테이블 리스트 쓰기. 수정사항을 반영한 전체 테이블 리스트 객체를 입력으로 받아 영구 저장.
 * @event
 * @param {METHOD} method - POST
 * @param {URL} url - /api/v2/table-list
 * @param {RequestBody} columns - JSONObject
 */
app.post('/api/v2/table-list/', async (req, res, next) => {
	//req.body.select, req.body.columns
	saveSome('columns', req.body.columns)
		.then(() => res.send({code: 0, msg: '쓰기 성공'}))
		.catch(err => res.send(getMessage('쓰기오류')))
		.finally(() => next())
})

/**
 * Reading table lists.
 * 
 * 테이블 리스트 읽기.
 * @event
 * @param {METHOD} method - PATCH
 * @param {URL} url - /api/v2/table-list
 * @param {ResponseBody} columns - JSONObject - {tableName1: {}, tableName2: {},...}
 */
app.patch('/api/v2/table-list/', async (req, res, next) => {
	findSome('columns')
		.then(columns => {
			//console.log(columns)
			if(_.has(req.body, 'tableName'))
			{
				// Use the pick function in lodash.js Library to extract a specific key-value pair from an object. 오브젝트에서 특정 키-값 쌍을 추출해 낼 때 로데시의 pick 함수를 사용.
				if(Array.isArray(req.body.tableName))
					res.send({code: 0, result: {columns: _.pick(columns, req.body.tableName) }})
				else
					res.send({code: 0, result: {columns: _.pick(columns, [req.body.tableName]) }})

			}
			else
			{
				res.send({code: 0, result: {columns: columns }})
			}
			
		})
		.catch(err => res.send(getMessage('읽기오류')))
		.finally(() => next())
	/* Example of a response. 응답 예시.
		{
			'테이블1': [
				{ field: '필드1', label: '필드1', visible: true, type: '멀티라인' },
				{ field: '필드2', label: '필드2', visible: true, type: '체크박스' },
				{ field: '필드3', label: '필드3', visible: true, type: '첨부파일' }
			]
		}
	*/

})

/**
 * Draft: Writing basic information. Logo title, logo image, etc
 * 
 * 초안 : 기본 정보 쓰기. 로고 타이틀, 로고 이미지 등
 * @event
 * @param {METHOD} method - POST
 * @param {URL} url - /api/v2/basic-info
 * @param {ResponseBody} - JSONObject -
 */
app.post('/api/v2/basic-info/', async (req, res, next) => {
	//req.body.basic.imageTitle,
	saveSome('basic-info', req.body.basic)
		.then(() => res.send({code: 0, msg: '쓰기 성공'}))
		.catch(err => res.send(getMessage('쓰기오류')))
		.finally(() => next())
})

/**
 * Draft: Read basic information. Logo title, logo image, etc
 * 
 * 초안 : 기본 정보 읽기. 로고 타이틀, 로고 이미지 등
 * @event
 * @param {METHOD} method - PATCH
 * @param {URL} url - /api/v2/basic-info
 * @param {ResponseBody} basic - JSONObject
 * {
 * 	'logoTitle':?,
 * 	'logoImage':?,
 * 	'logoImageExt':?
 * }
 */
app.patch('/api/v2/basic-info/', async (req, res, next) => {
	findSome('basic-info')
		.then(basic => res.send({code: 0, result: {basic: basic}}))
		.catch(err => res.send(getMessage('읽기오류')))
		.finally(() => next())
})

app.patch('/api/v2/user-list/', async (req, res, next) => {
	findSome('user')
		.then(user => res.send({code: 0, result: {user: user }}))
		.catch(err => res.send(getMessage('읽기오류')))
		.finally(() => next())
})

app.patch('/api/v2/rowlog/', async (req, res, next) => {
	//console.log('req.body', req.body)
	if(!_.has(req.body, 'id')) return next()
	//console.log(`rowlog-${req.body.tableName}-${req.body.id}`)

	findSome(`rowlog-${req.body.tableName}-${req.body.id}`)
		.then(rowlog => {
			console.log('rowlog', rowlog)
			res.send({code: 0, result: rowlog})
		})
		.catch(err => res.send(getMessage('읽기오류')))
		.finally(() => next())
})

/* multer file download. multer 파일 다운로드. */
app.get(['/api/v2/file-list/download', '/api/v2/file-list/download/:filetoken'], async (req, res, next) => {
	await createIfNot('files', {})

	async function transform(filetoken) {
		return 'screenshot-off.jpg'
		return tokenToFilenameMap[filetoken]

		return filetoken
		//return await findSomeBySome('files', filetoken)
	}
	const realFilename = await transform(req.params.filetoken)
	if(_.isNil(realFilename) || realFilename == undefined)
		return res.redirect('/many-table/error')

	console.log("whatisfilename", realFilename)
	const filename = path.join(path.resolve("../res"), '/files/', realFilename)
	if(res.headersSent) return next()
	res.download(filename, filename, (err) => {
		if(err) return next(err)
		else next()
	})
})

/* Uploading a file. 파일 업로드.
app.post('/api/v2/upload', upload.fields([{name:'userfile'}, {name:'row'}, {name:'field'}, {name:'tableName'}]), async (req, res, next) => {
	const file = req.files.userfile[0]
	console.log("여기 field", req.body.field)
	
	await replaceColumnOne(req.body.tableName, JSON.parse(req.body.row), req.body.field, filenameToTokenMap[file.originalname])
	res.send({code: 0, result: {filename: filenameToTokenMap[file.originalname]}})
	next()
})*/

app.post('/api/v2/user-list/', async (req, res, next) => {
	saveSome('user', req.body.user)
		.then(() => res.send({code: 0, msg: '쓰기 성공'}))
		.catch(err => res.send(getMessage('쓰기오류')))
		.finally(() => next())
})
app.post('/api/v2/env', async (req, res, next) => {
	_.assign(envMap, req.body)
	console.log('envMap', envMap)
	res.send({code: 0, msg: '쓰기 성공'})
	next()
})

app.all('/api/v2*', async (req, res, next) => {
	const method = {GET:'브라우저조회', PATCH: '조회', POST: '추가', PUT: '수정', DELETE: '삭제'}

	let msg = [req.user.username, method[req.method], dayjs()].join(' 구분자 ')
	if(_.has(req.body, 'row'))
		msg = [req.user.username, method[req.method], dayjs(), JSON.stringify(req.body.row)].join(' 구분자 ')
	if(_.isNil(req.body.tableName)) return next()
	if(req.url == '/api/v2/rowlog') return next()
	if(!_.has(req.body, 'row.id')) return next()

	const key = `rowlog-${req.body.tableName}-${req.body.row.id}`
	try {
		await createIfNot(key, [])
		findSome(key)
			.then(values => {
				values.push(msg)
				saveSome(key, values)
					.then(() => console.log('저장됨.'))
					.finally(() => next())
			})
			.catch()

	} catch(e) {
		console.log('app.all /api/v2* createIfNot(key)')
		console.log(getMessage('쓰기오류'))
		console.log(e)
		next()
	}
	
	/*
	updateSome(key, 'push', msg)
		.then(() => next())
		.catch((reason) => {
			createIfNot(key, [])
				.then(() => {
					updateSome(key, 'push', msg)
						.then(e => {
							console.log('업데이트섬,')
							next()
						})
				})
				.catch(reason => {})
		}).finally(() => {
			console.log(findSome(key).then(e => console.log('업데이트섬,', e)))
		})
	*/
})

app.get('/img/:img', (req, res, next) => {
	let common = path.join(__dirname, '..', "res/img/")
	let im = querystring.unescape(req.params.img)

	if(im == 'error') 
	{
		res.writeHead(200)
		res.end('')
	}

	let file, ext = 'jpg'
	if(im.split(".").length == 1)
	{
		log("이미지 파일 확장자 생성")
		file = `${common}${im}.jpg`
		try {
			fs.readFileSync(file)
		} catch(e) {
			res.writeHead(404, {"Content-Type": `image/jpeg`})
			res.end('')
			return
		}
	}
	else if(im.split(".").length == 2)
	{
		ext = im.split('.')[1]
		file = `${common}${im}`

		if(!(/(gif|jpe?g|tiff?|png|webp|bmp|svg)$/i).test(ext)) 
		{
			res.writeHead(400, {"Content-Type": `image/jpeg`})
			res.end('')
			return
		}
	}
	fs.readFile(file, (err, data) => {
		if(err)
		{
			log(err)
			res.writeHead(200, {"Content-Type": 'image/svg+xml'})
			res.end(fs.readFileSync(`${common}x.svg`))
		}
		else
		{
			log(`그림 다운로드 ${file}`)

			if(ext == 'jpg')
				ext = 'jpeg'
			else if(ext == 'svg')
				ext = 'svg+xml'
			res.writeHead(200, {"Content-Type": `image/${ext}`})
			res.end(data)
		}
		
	})
})
app.use(function(req, res, next) {
	if(req.url == '/favicon.ico') 
		res.locals.canRendered = 1
	else if(req.method != 'GET' && req.url.startsWith('/api/v2/'))
		res.locals.canRendered = 1

	if(res.locals.canRendered === undefined)
	{
		var err = new Error('Page Not Found')
		next(err)
	}
	else
		next()
})
app.use((err, req, res, next) => {
	//console.log(err.message)
	res.status(404).end()
})
