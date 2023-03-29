

(function() {
  const crud = {}
  let this_ = undefined
  crud.set = function (thisValue) 
  {
    this_ = thisValue
    return crud
  }

  crud.makeOneDummyRow = function (id, tableName) 
  {
    let row = {}
    if(_.isNil(tableName)) tableName = this_.tableName
    for(field of this_.columns[tableName])
      row[field.field] = ''
    if(id)
      row.id = id
    delete row.null
    return row
  }
  crud.deleteElementById = function (arr, id) {
    return arr.filter(e => e.id !== id)
  }
  crud.copyObjectByValue = function (from, to) {
    for(param in from)
    {
      if(param == 'null' || param == 'undefined') continue
      to[param] = from[param]
    }
  }

  crud.fnFind = function (isShowModalFindActive, tableName, selectTableName)
  {
    if(tableName === undefined)
      tableName = this_.tableName
    if(tableName === undefined)
      return
    
    let rowObj
    
    if(tableName === undefined) rowObj = this.makeOneDummyRow(undefined)
    else rowObj = this.makeOneDummyRow(undefined, tableName)

    this_.formProps = {data: [rowObj], meta: this_.columns[tableName], this_: this_, tableName: tableName, selectTableName: selectTableName}
    if(typeof isShowModalFindActive === 'string')
      this_[isShowModalFindActive] = true
  }

  crud.fnAdd = function (isAddFormActive, tableName)
  {
    function itemsNotEmpty(obj) {
      let cnt = 0
      for(key in obj)
      {
        if(key == 'null') delete obj[key] // ['null']
        if(_.isNil(obj[key]) || obj[key] == '')
          cnt++
      }
      return Object.keys(obj).length != cnt
    }
    if(tableName === undefined)
      tableName = this_.tableName
    if(tableName === undefined)
      return

    if(this_[isAddFormActive] == true && itemsNotEmpty(this_.add[tableName][0]))
    {
      http({uri:"/api/v2/", method:"post", param: {tableName: tableName, row: this_.add[tableName][0]}, cb: (res) => {
        
        // 서버단으로 옮겨갈 로직
        console.log('res', res)
        if(res.code == 0)
        {
          this_.add[tableName][0].id = res.insertId

          this_.add[tableName][0].metaTag = '추가'
          if(!_.isNil(this_.select))
            this_.select[tableName].unshift(this_.add[tableName][0])
        }
        this_.add[this_.tableName] = []
        this_.add[this_.tableName].push(this_.makeOneDummyRow(0))

      }})
    }
    this_[isAddFormActive] = !this_[isAddFormActive]
  }

  crud.fnUpdate = function(newRow, tableName) {

    if(tableName === undefined)
      tableName = this_.tableName
    if(tableName === undefined)
      return

    const to = _.find(this_.select[tableName], { id: newRow.id })
    //console.log('copyObjectByValue')
    //console.log(newRow, to)
    if(newRow && to)
      crud.copyObjectByValue(newRow, to)
    else 
      alert('엑셀 다운로드나 그래프를 보려면 새로고침 후 다시 작업하십시오.')
    http({uri:"/api/v2/", method:"put", param: {tableName: tableName, row: newRow}, cb: (res) => {
      //res = {code, msg, result}
      if(res.code == 0)
      {
        //변경 성공

      }
      else 
      {
        //변경 실패
      }
    } })
  }

  crud.fnDelete = function(row, tableName) {
    if(tableName === undefined)
      tableName = this_.tableName
    if(tableName === undefined)
      return

    http({uri: `/api/v2?a=${tableName}&b=${row.id}`, method: "delete", param: {}, cb: (res) => {
      //res = {code, msg, result}
      if(res.code == 0)
      {
        //삭제 성공
        this_.select[tableName] = crud.deleteElementById(this_.select[tableName], row.id)

      }
      else 
      {
        //삭제 실패
      }
    } })
  }

  window.crud = crud
}.call(this))