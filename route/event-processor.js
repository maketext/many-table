const dayjs = require("dayjs")
const _ = require("lodash")

const EventProcessor = function EventProcessor() {}
const eventProcessor = new EventProcessor()
const eventProcessor2 = new EventProcessor()
EventProcessor.prototype.store = []
EventProcessor.prototype.generateId = function() {
  return `A${(this.store.length + 1).toString().padStart(8, '0')}`
}
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
  this.store.push({id: this.generateId(), ...details})
}
EventProcessor.prototype.alarmStart = function (id) {
  const details = this.store.filter(details => details.id === id)[0]
  const [sender, receiver] = [details.sender, details.receiver]
  console.log(`Send Message from ${sender} to ${receiver}`)
}
eventProcessor.create({datetime: '', documentNo: '', type: '', sender: 'A Target', receiver: 'B Target'})
eventProcessor.alarmStart('A00000001')