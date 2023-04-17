const NodeRSA = require("node-rsa")
const dayjs = require("dayjs")
const _ = require("lodash")

// 문서 객체
// 서명 문서 객체, 전자서명 시그니처 배열 = [{username, name, signature}]
// keyPair 파라미터: 공개키, 개인키 쌍 보관
const documents = {
  keyPair: {},
  'MSS-2023-02-17-001': {
    // member contains signature information
    signValue: [{id: '아이디', name: '이름', sign: '서명값'}],
    // document members
    document: {a:1}
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
  const prefix = `MSS-${dayjs().format('YYYY-MM-DD')}`
  if(!_.has(documentNoMap, prefix))
    documentNoMap[prefix] = 0
  documentNoMap[prefix]++
  return `${prefix}-${documentNoMap[prefix].toString().padStart(3, '0')}`
}

/**
 * 
 * @param {Object} document - document object. 문서 객체.
 * @returns created document's document number. 생성된 문서의 문서번호
 */
function pushDocument(document)
{
  const documentNo = genDocumentNo()
  documents[documentNo] = {
    signValue: [],
    document: document
  }
  return documentNo
}

/**
 * Return the user's signature key. 유저의 서명키 반환.
 * @param {String} idAndName - id and name (format of 'id/name'). 아이디와 이름 ('아이디/이름' 포멧).
 * @returns signature key object of Buffer type. Buffer 타입 서명키 객체.
 */
function getMyKeys(idAndName) {
  const keyPair = documents.keyPair[idAndName]
  //return keyPair.exportKey('pkcs1-public-pem') // for Public Key
  return keyPair.exportKey('pkcs1-private-pem')
}

/**
 * When the document number and signer information (id, name) are given, it is signed. 문서 번호와 서명자 정보 (아이디, 이름)가 주어지면 전자서명한다.
 * @param {String} documentNo - Document Number. 문서번호.
 * @param {String} idAndName - Signer id and name (format of 'id/name'). 서명자 아이디와 이름 ('아이디/이름' 포멧).
 * @returns Signature Value Buffer Type. 서명 값 Buffer 타입.
 */
function sign(documentNo, idAndName) {
  
  // using node-rsa https://github.com/rzcoder/node-rsa
  if(!!!documents.keyPair[idAndName])
  {
    // create 512 bit key pair when no key pair (public key, signature key) exists. 서명 개인키가 없는 경우 512 비트 (공개키, 서명키) 쌍 생성.
    documents.keyPair[idAndName] = new NodeRSA()
    documents.keyPair[idAndName].generateKeyPair(512)
  }
  const keyPair = documents.keyPair[idAndName]
  //const privateKeyPlainText = key.exportKey('pkcs1-private-pem')
  //const publicKeyPlainText = key.exportKey('pkcs1-public-pem')

  const document = _.has(documents, documentNo) ? documents[documentNo] : undefined
  if(!!!document)
    throw Error('No document of document No. exists. 서명 대상 문서번호를 가진 문서가 없습니다.')
  if(!_.has(document, 'signValue'))
    document.signValue = []

  const [id, name] = idAndName.split('/')
  document.signValue.forEach(value => {
    if(value.id === id) // Duplicated signature value check by 'id' 아이디 기준으로 서명값 중복 검사
      throw Error('Duplicated signature value. 서명 값 중복')
  })

  // Make signature
  const signature = keyPair.sign(document.document)

  document.signValue.push({id: id, name: name, signature: signature})
  console.log('서명 시그니처', signature.toString('base64'))
  console.log('서명 여부', keyPair.verify(document.document, signature))
  return signature
}

function encrypt()
{
  const key = new NodeRSA()
  key.generateKeyPair(512)
  //const privateKeyPlainText = key.exportKey('pkcs1-private-pem')
  //const publicKeyPlainText = key.exportKey('pkcs1-public-pem')

  if(key.isPublic())
  {
    let EncBuffer = key.encrypt(documnet)
    let res = key.decrypt(EncBuffer, 'json')

    // Well be acted. 잘 동작함.
    // let buffer2 = Buffer.from(EncBuffer.toString('base64'), 'base64')
    // let res2 = key.decrypt(buffer2, 'json')
    // console.log(res2)
    // END. 끝.
    console.log(res)
  }

}

// CONSOLE TEST

// create document
const test = {
  documentNo: null
}
test.documentNo = pushDocument({a:1})

// sign the document with (id: abc, name: abc)
console.log(sign(test.documentNo, 'abc/abc').toString('base64'))

// get signature key of user (id: abc, name: abc)
console.log(getMyKeys('abc/abc'))