const AlarmService = {
  props: [],
  data() {
    return {
      isShowAlarmModalActive: false,
      socketManager: null,
      alarmSocket: null,

      alarmListCilentSide: []
    }
  },
  template: `
    <div class="tile h100">
      <div class="ib m-auto" style="margin-left: 0">
        <b-dropdown
          position="is-bottom-left"
          append-to-body
          aria-role="menu"
          trap-focus
          active-change="(active) => active ? undefined : undefined"
        >
          <template #trigger>
            <a
              class="navbar-item"
              role="button">
              <span>알람 보기</span>
              <b-icon icon="menu-down"></b-icon>
            </a>
          </template>
          <b-dropdown-item
            aria-role="menu-item"
            :focusable="false"
            custom
            paddingless>
            <button class="functional" @click="socketEmit();isShowAlarmModalActive = true;">알람 보기</button>
            <table>
              <summary>알람 리스트</summary>
              <thead>
              </thead>
              <tbody>
                <tr v-for="alarm in alarmListCilentSide">
                  <td>{{alarm}}</td>
                </tr>
              </tbody>
            </table>
          </b-dropdown-item>
        </b-dropdown>
      </div>
    </div>
  `,
  methods: {
    addAlarmList: function (details) {
      this.alarmListCilentSide.push(details)
    },
    socketOn: function () {
      this.alarmSocket.on("connect", () => {
        console.log("Web Socket Connection success.")
      })
      this.alarmSocket.on("핑받음", (msg) => { 
        console.log("핑받음", msg)
        this.addAlarmList(msg)
      })
    },
    socketEmit: function () {
      setTimeout(() => {
        this.alarmSocket.emit('핑', '핑 메시지')
      }, 100)
      this.isShowAlarmModalActive = true
    },
    socketInit: function () {
      this.socketManager = new io.Manager("http://localhost:8889")
      this.alarmSocket = this.socketManager.socket("/alarm")
      this.socketManager.open((err) => {
        console.log(err, "Web Socket opened.")
      })
    }
  },
  created() {
    console.log("'WebSocketClientProcessor' component created.")
    this.socketInit()

    setTimeout(() => {
      this.socketOn()
      this.socketEmit()
    }, 500)
  }
}  