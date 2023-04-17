const NodeRSA = require("node-rsa")
const dayjs = require("dayjs")

// 문서 객체
// 서명 문서 객체, 전자서명 시그니처 배열 = [{username, name, signature}]
// keyPair 파라미터: 공개키, 개인키 쌍 보관
const documents = {
  keyPair: {},
  'MSS-2023-02-17-001': {
    signValue: [{id: '아이디', name: '이름', sign: '서명값'}],
    document: {}
  }
}

// 문서번호별 넘버링 중복 방지용 맵 자료구조
const documentNoMap = {
  'MSS-2023-02-17-001': 0,
}

/**
 * 문서번호 중복 여부 검사
 * @param {String} no - 중복 검사할 문서번호 
 * @returns 문서번호 중복 여부
 */
function checkDuplicatedDocumentNo(no)
{
  if(_.has(documents, no)) return true
  return false
}

/**
 * 문서번호 생성
 * 초안 : 접미어 '-999' 값 초과 값에 대해 문서번호 생성 중단 처리
 * @returns 중복하지 않는 문서번호 출력. 값은 예를 들어 MSS-2020-01-01-001 부터 MSS-2020-01-01-999 까지 가능함.
 */
function genDocumentNo() 
{
  function makeThreeDigit(no) {
    if(no / 100 > 0) return `${no}`
    if(no / 10 > 0) return `0${no}`
    return `00${no}`
  }
  const prefix = `MSS-${dayjs().format('YYYY-MM-DD')}`
  if(!_.has(documentNoMap, prefix))
    documentNoMap[prefix] = 0
  documentNoMap[prefix]++
  return `${prefix}-${makeThreeDigit(documentNoMap[prefix])}`
}

/**
 * 유저의 개인키 반환
 * @returns Buffer 타입 개인키 객체 
 */
function getMyKeys(username) {
  const keyPair = documents.keyPair[username]
  //return keyPair.exportKey('pkcs1-public-pem') // for Public Key
  return keyPair.exportKey('pkcs1-private-pem')
}

/**
 * 문서 객체와 서명자 정보가 주어지면 문서에 전자서명한다.
 * 초안 : 서명자 아이디, 서명자 이름이 주어지지 않을 경우 세션에서 가져옴.
 * @param {Object} form - 서명 대상 문서 객체
 * @param {String} username - 서명자 아이디.
 * @param {String} name - 서명자 이름.
 * @returns 서명 성공 여부를 나타내는 오브젝트 {status: true, false 중 하나, reason: '', '중복', '서명 개인키 없음', '문서번호 중복' 중 하나}
 */
function doSign (form, username, name) {
  if(_.isNil(form.form.no) || form.form.no == '')
    form.form.no = genDocumentNo()
  if(checkDuplicatedDocumentNo(form.form.no))
    return {status: false, reason: '문서번호 중복 에러'} // 문서번호 중복 에러

  const signature = sign(form.form, `${username}/${name}`)
  if(!signature)
    return {status: false, reason: '서명 개인키 없음 에러'} // 서명 개인키 없음 에러

  if(_.isNil(documents[form.form.no]))
    documents[form.form.no] = {}

  if(!checkDuplicatedSigner())
  {
    documents[form.form.no].signValue.push({username: username, name: name, signature: signature})
    documents[form.form.no].document = form.form
    return {status: true, reason: ''} // 서명 성공
  }
  return {status: false, reason: '이미 서명한 서명자 에러'} // 이미 서명한 서명자 에러
}

/**
 * Development Completes. 개발 완료.
 * @param {JSONObject} sign - title, fingerprints
 */
function sign(document, username) {

  // Sample Source Code of node-rsa https://github.com/rzcoder/node-rsa
  if(!!!documents.keyPair[username])
  {
    documents.keyPair[username] = new NodeRSA()
    documents.keyPair[username].generateKeyPair(512)
  }
  const keyPair = documents.keyPair[username]
  //const privateKeyPlainText = key.exportKey('pkcs1-private-pem')
  //const publicKeyPlainText = key.exportKey('pkcs1-public-pem')

  let bufferSigned = keyPair.sign(document)
  console.log('서명 시그니처', bufferSigned.toString('base64'))
  console.log('서명 여부', keyPair.verify(document, bufferSigned))
  return bufferSigned
}

function encrypt()
{
  // Sample Source Code of node-rsa https://github.com/rzcoder/node-rsa
  
  const key = new NodeRSA()
  key.generateKeyPair(512)
  //const privateKeyPlainText = key.exportKey('pkcs1-private-pem')
  //const publicKeyPlainText = key.exportKey('pkcs1-public-pem')

  if(key.isPublic())
  {
    let EncBuffer = key.encrypt(documnet)
    let res = key.decrypt(EncBuffer, 'json')

    // 잘 동작함.
    // let buffer2 = Buffer.from(EncBuffer.toString('base64'), 'base64')
    // let res2 = key.decrypt(buffer2, 'json')
    // console.log(res2)
    // 끝.
    console.log(res)
  }

}

// CONSOLE TEST
console.log(sign({a:1}, 'abc').toString('base64'))
console.log(getMyKeys('abc'))
