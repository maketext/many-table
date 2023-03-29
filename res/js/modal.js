const ModalFindForm = {
  props: ['data', 'meta', 'this_', 'condition', 'tableName', 'selectTableName', 'fn'],
  methods: {
    fnSend: function() {
      function calcFunc(func, row, beforeValue) {
        if(func.includes('적산'))
        {
          func = func.replace('(', '').replace(')', '').replace('적산', '').trim()
          if(_.isNil(beforeValue)) beforeValue = 0
          let currentValue = Number(row[func]) + Number(beforeValue)
          return  isNaN(currentValue) ? 0 : currentValue
        }

        let operation = [{op: '+', e: func.split('+')}, {op: '-', e: func.split('-')},
          {op: '*', e: func.split('*')}, {op: '/', e: func.split('/')}]
        operation = operation.filter(elements => elements.e.length == 2)
        if(operation.length == 1) // 사칙연산 함수식 구현 시작
        {
          const [e1, e2] = operation[0].e
          if(operation[0].op == '+')
            return Number(row[e1]) + Number(row[e2])
          else if(operation[0].op == '-')
            return Number(row[e1]) - Number(row[e2])
          else if(operation[0].op == '*')
            return Number(row[e1]) * Number(row[e2])
          else if(operation[0].op == '/')
            return Number(row[e1]) / Number(row[e2])
        }
        return undefined
      }
      console.log(this.data)
      _.forOwn(this.data[0], (value, key) => {
        if(value === '' || _.isNil(value)) delete this.data[0][key] 
      })

      if(this.tableName === undefined)
        this.tableName = this.this_.tableName
      http({uri:"/api/v2/", method:"patch", param: {tableName: this.tableName, query: this.data[0], condition: this.condition}, cb: (res) => {
        //res = {code, msg, result}
        if(res.code === 1)
        {
          alert('내용이 없습니다.')
          return
        }
        this.this_.columns[this.tableName].filter(field => field.type == '날짜').forEach((field, i) => {
          for(const row of res.result)
          {
            row[field.field] = new Date(dayjs(row[field.field]).valueOf())
            if(row[field.field].toString() == 'Invalid Date')
              row[field.field] = null
          }
        })
        this.this_.columns[this.tableName].filter(field => field.type == '수식').forEach((field, i) => {
          for(const [i, row] of res.result.entries())
          {
            let beforeValue
            if(i - 1 >= 0)
              beforeValue = res.result[i - 1][field.field]
            if(field.func.includes('적산'))
              row[field.field] = calcFunc(field.func, row, beforeValue)
            else
              row[field.field] = calcFunc(field.func, row)
          }
          
        })
        if(this.selectTableName == 'add')
        {
          try {
            this.this_[this.selectTableName][this.tableName] = [res.result[0]]
          } catch(e) {
          }
        }
        else
        {
          this.this_.select[this.tableName] = res.result
          this.this_.widthOfTableCell = undefined
        }
        this.$emit('close')


      } })
    }
  },
  template: `
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">검색</p>
        <button
          type="button"
          class="delete"
          @click="$emit('close')"/>
      </header>
      <section class="modal-card-body">
        <div class="tile">
          <span class="m-tb-auto mr form-label">필드끼리의 조건</span>
          <b-select v-model="condition">
            <option
              key="0"
              value = "검색 조건을 선택하세요."
              disabled>
              검색 조건을 선택하세요.
            </option>
            <option
              key="1"
              :value="null">
              또는 포함
            </option>
            <option
              key="2"
              value="그리고 포함">
              그리고 포함
            </option>
          </b-select>
        </div>
        <div style="height:1em"/>
        <b-table :data="data" :td-attrs="(column) => {align: 'right'}" focusable="focusable">
          <b-table-column v-for="column in meta" :field="column.field" :label="column.label" :width="undefined" :visible="column.visible"><template v-slot="props">
            <b-input v-model="props.row[column.field]"></b-input>
          </template></b-table-column>
        </b-table>
      </section>
      <footer class="modal-card-foot">
          <div class="tile">
            <div class="tile"></div>
            <b-button @click="fnSend();" label="검색"/>
      </footer>
    </div>
  `,
  created() {
  }
}
Vue.component('modal-find-form', ModalFindForm)