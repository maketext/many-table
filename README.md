# many-table
This is an introduction to the many-table under development.

Please participate in modifying source code and development a lot. Contact us [https://plusuniv.com](https://plusuniv.com)

And can use with Commercial Use. Many Stallings Company will do.

---

- We now develop "digital signature on published report" part using node-rsa Library.

  - node-rsa
  [https://github.com/rzcoder/node-rsa](https://github.com/rzcoder/node-rsa)

- We now develop "Alarm Service through to request signing report" part using socket.io

  - socket.io
  - [https://socket.io](https://socket.io)


- Our coding guide includes full using lodash Library.
  - [https://lodash.com](https://lodash.com)

- We introduced Map-based Variable structure for productivity.

```javascript
const va = {}
va['Variable name 1'] = 100
va['Variable name 2'] = '200'
```

- We develop pure process of "remember-me" token functionality, and not using passport-remember-me based one, because of internal error.

- This Library use Database System (Google LevelDB) and another one, MongoDB based one will be introduced by dual. 

- be changing Web Design

## Login
The login account information is determined during the test phase.


![image01](https://user-images.githubusercontent.com/32004044/228518202-670313e8-dad1-4d8a-ab10-b82bf3df1aac.png)


[https://plusuniv.com/many-table/login](https://plusuniv.com/many-table/login)

ID: admin2\
PW: 1\
Must check the radio option. Session logout will be performed after 15 min. But remember-me token will be remained in browser connecting. You can Ctrl+Shift+Del on browser and delete all the cookies.

## Main
![image02](https://plusuniv.com/img/link/Frame1.png)

## Create Table Sheet
![image03](https://plusuniv.com/img/link/Frame5.png)

## Search Data
You can search with all the columns, any combined ones__
![image04](https://plusuniv.com/img/link/Frame2.png)

## Input Mutliline Data
![image05](https://plusuniv.com/img/link/Frame3.png)

## Export Report Form
Transform row data as document PDF.\
![image06](https://plusuniv.com/img/link/Frame8.png)

## Report
Complete the form directly against the form.\
![image07](https://user-images.githubusercontent.com/32004044/228518350-5320a3c7-39e8-4b1f-96bb-ad2ebb4fe8f1.png)

## Approving a report
Sign and select a recipient to send an approval request.

![image08](https://plusuniv.com/img/link/Frame6.png)

## Certificate Showing
![image09](https://plusuniv.com/img/link/Frame7.png)

## Chart
![image10](https://user-images.githubusercontent.com/32004044/228518637-45f9f68e-0c3b-4118-902a-563ffeea834d.png)

Using TOAST UI - NHN Cloud Open Source. ([https://ui.toast.com/](https://ui.toast.com/))

## Solution Help
![image11](https://user-images.githubusercontent.com/32004044/228518695-251255f1-9813-472b-a2e3-9c35a6904c34.png)

## License
Many Table's License is equal to MIT License.
Many Table's license applies to all parts of Many Table that are not externally maintained libraries.

Copyright (c) 2022.12-2023, Changho Lee.

### Externally maintained Libraries

Node.js, Express.js, LevelDB, Vue.js 2, Buefy CSS Framework, Dayjs, Axios, jQuery, lodash, Toast UI Chart and extra else.
