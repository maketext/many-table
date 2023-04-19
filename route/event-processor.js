const dayjs = require("dayjs")
const _ = require("lodash")

const EventProcessor = function EventProcessor() {}
const eventProcessor = new EventProcessor()
EventProcessor.prototype.store = []
EventProcessor.prototype.generateId = function() {
  return `A${(this.store.length + 1).toString().padStart(8, '0')}`
}

/**
 * Generate and store one event details from input parameter (details)
 * @param {Object} details - fields object contains 'datetime', 'documentNo', 'type', 'sender', 'receiver'. ('repeatCount', 'repeatInterval' are optional)
 * @returns Auto-generated ID
 */
EventProcessor.prototype.create = function (details) {
  // 필드 유효성 검사
  let fields = ['datetime', 'documentNo', 'type', 'sender', 'receiver'] // repeatCount, repeatInterval
  if(fields.reduce(
    (accumulator, field) => accumulator || (_.has(details, field)
      ? false
      : true)
    ,
    false
    ))
    Error('필수 필드가 모두 포함되어 있지 않은 이벤트 요청입니다.')
  const id = this.generateId()
  this.store.push({id: id, ...details})
  return id
}

/**
 * Do the alarm of target id
 * @param {String} id - Target Alarm ID
 */
EventProcessor.prototype.alarmStart = function (id) {
  const details = this.store.filter(details => details.id === id)[0]
  const [sender, receiver] = [details.sender, details.receiver]
  console.log(`Send Message from ${sender} to ${receiver}`)
  
}
eventProcessor.create({datetime: '', documentNo: '', type: '', sender: 'A Target', receiver: 'B Target'})
eventProcessor.alarmStart('A00000001')