# Concern-Backend 疫距數得-線上課程專注度輔助套件-後端系統 
## 專案概述
<img src="https://i.imgur.com/88WCXfj.png" align="right" width="250" style="margin: 0 10px 5px;">

「疫距數得」是一款「線上教學專注度評估之 Chrome 擴充套件」，針對 Google Meet 視訊教學進行設計，分成老師端、學生端。學生端蒐集學生視訊畫面，透過後台運算學生專注度，回傳提醒學生上課狀況，以視覺化圖示（紅、黃、綠三色外框）顯示於老師端，提供所有學生的專注狀況。

另外，課程結束後的相關上課歷程記錄檔，可提供學生檢視課堂上學習歷程，達到自我省思的目的。同時教師也能據此記錄檔，分析其教學歷程，作為下次教學內容調整或是教學方法的改進參考。

## 專案展示
https://youtu.be/b9yrEX5ux2U

## Swagger API 文件
https://app.swaggerhub.com/apis/qmsiteandy/Concern-BackEnd-202106/1.0.0

## 使用工具
項目       |工具
----------|----------------
後端開發   | Node.js、Express 架構、Socket.io
資料庫     | MongoDB
雲端部屬   | Heroku

<!-- -------- -->
## 系統功能概述

本系統分成三個部分：學生端套件、教師端套件、後端系統。

學生端功能        |  教師端功能    | 後端系統  
-----------------|---------------|------
演算學生專注度    |  顯示所有學生專注度 | 串接兩端套件
不專心警示        | 上下課、課間休息管理| Database 處理
進行點名         | 點名功能|  
上課狀況統計資訊 (個人)  | 上課狀況統計資訊 (整體)  |
&nbsp;          | 自動允許學生進入 Meet 功能|

> 其中【演算學生專注度】功能也是我負責開發，相關說明在這個 [Repo](https://github.com/qmsiteandy/concern-with-facemesh) 中。

## 資料庫架構  
資料庫分為三個 Collection 關聯如下圖：
- 一位教師帳號 (Teacher) 可以擁有多堂課程 (Course)
- 一堂課程 (Course) 可能會有很多週的上課教室資料 (Classroom)  

![資料庫架構](https://i.imgur.com/dp8B45f.png)

### Classroom 資料
本系統最基礎的功能只需要 classroom 資料就能達成，用來傳輸紀錄學生專注資訊、紀錄上課下課及課間休息時間等。另外進階功能如點名，也是記錄在 Classroom 資料中。
![資料庫架構-classroom](https://i.imgur.com/LSxHIf2.png)

### Teacher 資料
記錄教師資訊，以及所屬的課程清單。
![資料庫架構-teacher](https://i.imgur.com/HPELQK9.png)

### Course 資料
記錄這個課程中的學生名單、各週課程的 classroom 資料編號、以及各週請假的學生名單。  
![資料庫架構-course](https://i.imgur.com/un3yv3O.png)

<!-- ======================================= -->

# 功能介紹 & 運作邏輯
## 目錄
[專注度傳輸功能](#一專注度傳輸功能)  
[教室管理](#二教室管理)  
[後臺連續課程設定](#三連續課程設定-進階後臺功能)  
[後臺上課狀況統計資訊](#四後臺上課狀況統計資訊-進階後臺功能)  
[課程學生名單](#五課程學生名單-進階後臺功能)  
[點名功能](#六點名功能-進階後臺功能)  
[自動允許學生進入 Meet 功能](#七自動允許學生進入-meet-功能-進階後臺功能)  


<!-- -------- -->
## 一、專注度傳輸功能
在學生端套件中，前端透過 WebCam 視訊鏡頭取的學生人臉圖像，演算出學生專注數值 (詳閱 [這個專案](https://github.com/qmsiteandy/concern-with-facemesh)) 。學生端定期將數值傳至後台 Server 紀錄，而教師端套件則定期抓取全班數值更新資料，並以顏色外框呈現學生專注程度，如圖：
![教師端畫面](https://i.imgur.com/tknOfEc.png)

### 學生端上傳專注度
1. 首先學生帳號開始使用此系統時，會需要先透過 API \<POST\> /student/enterClassroom/{classroomMeetID} 進入教室，後端會在該課程的 classroom data 中加入此學生資料，並回傳 `classroomDataID` 為此課程的資料Id及 `indexInList` 代表此學生資料在 classroom.classmates 資料陣列中的索引值。
2. 呼叫 API \<POST\> /student/upload 上傳專注數值，並帶入 `classroomDataID`、`indexInList`、`concernDegree`，由後臺寫入資料庫 classroom.classmates 中。
3. upload 功能包含兩機制：從 classroom 資料的 `isClassing` 及 `isResting` 判斷是否未開始或休息中，此時會暫停寫入功能；另外也有計時器控管同一學生的資料寫入頻率，以避免過多資訊寫入的狀況發生。

### 教師端取得專注度
1. 教師端呼叫 API \<GET\> /teacher/getAllNewData/{classroomMeetID} 獲得所有學生最新的專注數值資料，並於前端渲染對應的視訊外框。

<!-- -------- -->
## 二、教室管理
教師端可以透過套件控制課程狀態，順序為：開啟教室 → 課程開始 → (課間休息 → 休息結束)*N → 課程結束。前端介面展示：
![](https://i.imgur.com/9gdubCk.png)

### 開啟教室
開啟教室主要目的是在資料庫中新增該會議的 classroom 資料，有此資料後，學生端才得以加入。
1. 教師端呼叫 API \<GET\> /teacher/openClassroom/{classroomMeetID} 開啟教室資料，其中 classroomMeetID 為 Google Meet 會議室代碼。(例如 jhc-yyia-asz)
2. 此 API 建立 classroom 資料後回傳 ObjectId ，為避免與其他 collection 的 ObjectId 搞混，我將回傳的資料命名為 `classroomDataID`。

### 課程開始 / 課程結束
1. 教師端呼叫 API \<GET\> /teacher/startClass/{classroomMeetID} 開始課程，並在資料庫紀錄時間。
2. 教師端呼叫 API \<GET\> /teacher/endClass/{classroomMeetID} 結束課程，並在資料庫紀錄時間。
3. 開始或結束課程時，會更改資料中的 `isClassing` 項目，當學生端呼叫 upload API 時會檢查是否正在課程中。

### 課間休息 / 休息結束
1. 教師端呼叫 API \<GET\> /teacher/startRest/{classroomMeetID} 開始休息，並在 classroom 資料 的 restTime 陣列紀錄時間。
2. 教師端呼叫 API \<GET\> /teacher/endRest/{classroomMeetID} 結束休息。
3. 開始休息或結束休息時，會更改資料中的 `isResting` 項目，當學生端呼叫 upload API 時會檢查是否正在休息中。


<!-- -------- -->
## 三、連續課程設定 (進階後臺功能)
教師可以在套件介面註冊登陸後，設定自己的課程項目，並將現在所在的教室資料與課程相連。
> 沒有與課程相連的教室資料，會在視訊會議結束後自動刪除；有聯結的教室資訊則可在未來重複檢視。

![](https://i.imgur.com/e6uyYEQ.png)

### 教師註冊/登入
- 教師端呼叫 API \<POST\> /teacher/teacherRegisterLogin 並帶入 teacherName 及 teacherID ，此功能主要目的是在 teacher collection 中建立該老師的資料，並回傳屬於該教師的 course 課程項目。

### 新增課程
- 教師端呼叫 API \<POST\> /teacher/addCourse 並帶入 teacherDataID 及 courseName 以此新增屬於該教師的課程資料。

### 連結教室與課程資料庫
- 教師端呼叫 API \<POST\> /teacher/linkClassroomToCourseWeek 並帶入 courseDataID 及 classroomDataID ，將已開啟的 classroom 資料連結至 courseData。
    >course.courseWeeks 新增一個 week item 並將 classroomDataID 記錄在這個 item 中。

<!-- -------- -->
## 四、後臺上課狀況統計資訊 (進階後臺功能)
在課程期間，資料庫會儲存學生的專注數值、以及課程狀態的時間記錄等。在後台介面中可以看到相關的統計資訊。

### 時間紀錄
呼叫 API \<GET\> /classroom/getTimeStatus/{classroomDataID} 取得課程的時間資訊。  

![](https://i.imgur.com/8CR92LZ.png)

### 專注排行榜
呼叫 API \<GET\> /classroom/getRank/{classroomDataID} 取得專注排行榜，並可帶入 query 資料 rankCount 設定要回傳前幾名的資料 (預設為前三名)。排名項目有三種：
- 專注平均值
- 專注百分比
- 最常持續專注時間

![](https://i.imgur.com/13whvuR.png)

### 全班統計資訊
呼叫 API \<GET\> /classroom/getStatisticsDiagram/{classroomDataID} 取得全班統計圖資訊，包含：
- 各時間段專注分數平均值
- 各時間段中專注程度的人數統計

並可以透過 query 資料 timeSpacing 來設定圖表的時間軸間隔。

後續由前端繪製圖表，如下圖：
![](https://i.imgur.com/C3AGppP.png)
![](https://i.imgur.com/pRLGbY6.png)

### 學生個別資訊
呼叫 API \<GET\> /classroom/getPersonDiagramList/{classroomDataID} 取得全班每位學生的個別統計資料，包含：
- 單一學生的專注度及時間對照表資訊
- 單一學生在課程中的專注分數平均
- 單一學生在課程中的專注百分比
- 單一學生在課程中最長的持續專注時間

並可以透過 query 資料 timeSpacing 來設定圖表的時間軸間隔。

![](https://i.imgur.com/JJxoWKe.png)

<!-- -------- -->
## 五、課程學生名單 (進階後臺功能)
在課程中可以添加學生名單，可以進行[點名功能](#六點名功能-進階後臺功能)、[自動允許學生進入 Meet 會議室功能](#七自動允許學生進入-meet-功能-進階後臺功能)

學生名單資料會儲存在 Course 資料中的 classmates 陣列中。

前端介面展示：
![](https://i.imgur.com/2aU1bCT.png)

### 手動新增/修改/刪除
- 新增：呼叫 API \<POST\> /course/addStudent/{courseDataID} 並帶入 studentName、studentGoogleName、studentID 新增一位學生。
- 修改：呼叫 API \<PUT\> /course/editOneStudent/{courseDataID} 並帶入 studentIndex、studentName、studentGoogleName、studentID 修改一位學生。
- 刪除：呼叫 API \<DELETE\> /course/deleteOneStudent/{courseDataID} 並帶入 studentID 刪除一位學生。

### 批量新增名單
1. 當教師要批量新增名單時，首先需要下載【格式範例.csv】並依據範例填寫學生資料。
2. 於前端上傳填寫好的 CSV 檔，轉換為 JSON 資料。
3. 呼叫 API \<POST\> /course/addMultipleStudents/{courseDataID} 並帶入資料以批量新增學生名單。

<!-- -------- -->
## 六、點名功能 (進階後臺功能)
教師呼叫點名功能後，所有該課程學生畫面跳出點名視窗，學生需要在時間內按下點名鍵。點名結束後會在教師後台介面顯示點名結果。
![](https://i.imgur.com/PRIZDU5.png)

### 開始點名
1. 教師端呼叫 API \<GET\> /classroom/startRollcall/{classroomDataID} 並可以帶入 query string 資料 duration 設定倒數時間 (預設為 60 秒)。
2. Server 透過 socket 協定通知所有在此教室的使用者開始進行點名。

### 學生按下點名
1. 學生端套件收到 socket 訊號後，前端跳出點名視窗。
2. 學生點擊點名按鈕時，呼叫 API \<POST\> /student/rollcall 並帶入 body 包含 classroomDataID, studentID, rollcallIndex 等資訊成功點名。

### 取得點名結果
1. 教師後台呼叫 API \<GET\> /classroom/getRollcallStatus/{classroomDataID} 取得所有點名資訊。
2. 此功能會依序判斷名單中學生有無點名成功(出席) -> 是否請假 -> 如果都沒有則判定缺席。

### 請假設定
1. 如果有學生當次上課請假，教師可以在後台管理系統中勾選請假功能。
2. 呼叫 API \<PUT\> /classroom/setPersonalLeave/{classroomDataID} 並帶入 studentID, truefalse(請假/取消請假) 修改一位學生的請假與否狀態。


<!-- -------- -->
## 七、自動允許學生進入 Meet 功能 (進階後臺功能)
在 Google Meet 線上課程中，通常教師需要手動允許使用者加入會議室。本系統的 Auto-admit 功能可以在使用者加入時，自動比對課程名單並允許學生進入會議室。
![](https://i.imgur.com/KVOch33.png)

### 確認學生是否在課程名單中
1. 教師端套件偵測到申請進入時，抓取學生的名稱。
2. 呼叫 API \<GET\> /course/checkStudentInList/{courseDataID}?studentGoogleName= 判斷此學生是否已存在在課程名單中。
3. 當 API 回傳 true 時，自動允許加入。


<!-- ======================================= -->
# 後記：
這個專案算比較早期的作品，那時候對於後端的概念還不多，因此有許多可改進的地方例如：
1. 沒做權限控管，很多個人資訊存在前端 localStorage 中 (例如學生資料在 classmates 陣列中的 indexInList) ，如果資料被竄改就可能影響數值紀錄的正確性。並且如果有用 JWT token 就不用每次呼叫 API 都得帶入一堆參數…
2. 傳輸數值的方式需要不斷對 MongoDB 寫入讀取，非常耗效能。未來可以嘗試依靠 socket.io 傳輸以及 redis 暫存資料，待一定時間或一定資訊量後再一次寫入 MongoDB 中。
2. 許多 API path 不夠精簡。
2. 那時候的後端程式都是自己寫自己看，沒有習慣寫註解。
5. 資料表的設計部分也可以再改進，例如學生的專注數值資料可以在獨立一個 Collection，減少 Classroom 資料的規模。