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
不專心警示        | 上下課、課間休息管理|
進行點名         | 點名功能|  
上課狀況統計資訊 (個人)  | 上課狀況統計資訊 (整體)  |
&nbsp;          | 自動允許學生進入 Meet 功能|

> 其中【演算學生專注度】功能也是我負責開發，相關說明在這個 [Repo](https://github.com/qmsiteandy/concern-with-facemesh) 中。

## 資料庫架構
![資料庫架構-classroom](https://i.imgur.com/LSxHIf2.png)
![資料庫架構-teacher](https://i.imgur.com/HPELQK9.png)
![資料庫架構-courser](https://i.imgur.com/un3yv3O.png)

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
教師端可以透過套件控制課程狀態，順序為：開啟教室 → 課程開始 → (課間休息 → 休息結束)*N → 課程結束。

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
教師可以在後台介面中設定屬於自己的課程，並且設定相關資訊。

### 教師註冊/登入
教師端呼叫 API \<POST\> /teacher/teacherRegisterLogin 並帶入 teacherName 及 teacherID ，此功能主要目的是在 teacher collection 中建立該老師的資料，並回傳屬於該教師的 course 課程項目。

### 新增課程
教師端呼叫 API \<POST\> /teacher/addCourse 並帶入 teacherDataID 及 courseName 以此新增屬於該教師的課程資料。

### 連結教室與課程資料庫
教師端呼叫 API \<POST\> /teacher/linkClassroomToCourseWeek 並帶入 courseDataID 及 classroomDataID ，將已開啟的 classroom 資料連結至 courseData。
>course.courseWeeks 新增一個 week item 並將 classroomDataID 記錄在這個 item 中。

<!-- -------- -->
## 四、後臺上課狀況統計資訊 (進階後臺功能)
在課程期間，資料庫會儲存學生的專注數值、以及課程狀態的時間記錄等。在後台介面中可以看到相關的統計資訊。

### 時間紀錄
呼叫 API \<GET\> /classroom/getTimeStatus/{classroomDataID} 取得課程的時間資訊。

### 專注排行榜
呼叫 API \<GET\> /classroom/getRank/{classroomDataID} 取得專注排行榜，並可帶入 query 資料 rankCount 設定要回傳前幾名的資料 (預設為前三名)。排名項目有三種：
- 專注平均值
- 專注百分比
- 最常持續專注時間

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

### 手動新增/修改/刪除

### 批量新增名單

<!-- -------- -->
## 六、點名功能 (進階後臺功能)

### 開始點名

### 學生按下點名

### 取得點名結果

### 請假設定

<!-- -------- -->
## 七、自動允許學生進入 Meet 功能 (進階後臺功能)

### 確認學生是否在課程名單中

<!-- ======================================= -->
# 後記：
可改進的地方