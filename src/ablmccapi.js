const jsdom = require("jsdom");
const fetch = require("node-fetch")
const iconv = require("iconv-lite")
const { JSDOM } = jsdom;


// Class convert to number for request of HTML
function classNameConvert(classname) {
    return (parseInt(classname)-1)*4 + (classname.charCodeAt(1) - 65);
}

// Build homework JSON from html table element
function HWBuilder(table) {
  let result = [];
  for(let i=1, currentSubject='', p=0; i<table.length; i++) {
    let ele = table[i];

    let holder = ele.querySelector('.subject');
    let subject = holder == undefined ? currentSubject : holder.textContent;
    if(currentSubject != subject) currentSubject = subject;

    let date = ele.querySelector('.homeworkIssueDate').textContent;

    let summary = ele.querySelector('.homeworkText').textContent;


    result[p++] = {'subject': subject, 'summary': summary, 'date': date};
  }
  return result;
}

// Check if the server is down
function checkAvailability() {
  const timeout = new Promise((resolve, reject) => {
      setTimeout(reject, 500, 'Request timed out');
  });

  const request = fetch('https://web.ablmcc.edu.hk/index/index18.aspx?nnnid=1');

  return Promise
      .race([timeout, request])
      .then(response => {
        console.log('server is online'); return true;
      })
      .catch(error => {
        console.log('server is down'); return false;
      });
}

function getABLMCC(url, callback) {
  return fetch(url)
          .then((r) => r.textConverted())
          .then((rt) => {
            let doc = new JSDOM(rt).window.document
            //console.log(doc);
            callback(doc);
            return doc;
          })
          .catch((err) => console.error(err));
}


/*
  get ABLMCC notices from user enter year
  @Param {Number} year - year chosen
  @Param {Callback} callback - the callback
  @Return {Promise} fetch - the fetching
*/
function getABLMCCNotices(year, callback) {
  return fetch('https://web.ablmcc.edu.hk/Content/07_parents/notice/index.aspx')
          .then((r) => r.text()).then((rt) => {
            let doc = new JSDOM(rt).window.document
            let target = "ctl00%24ContentPlaceHolder1%24ddlstSchoolYear";
            let viewState = encodeURIComponent(doc.getElementById('__VIEWSTATE').attributes[3].nodeValue);
            let eventValidation = encodeURIComponent(doc.getElementById('__EVENTVALIDATION').attributes[3].nodeValue);
            let yr = new Date().getFullYear();
            let month = new Date().getMonth();
            let placeHolder = year == 0 ? (month<9 ? yr-1 : yr) : year;

            console.log('placeHolder:' + placeHolder);

            return fetch('https://web.ablmcc.edu.hk/Content/07_parents/notice/index.aspx', {
              method: "POST",
              headers: {"Content-Type": "application/x-www-form-urlencoded"},
              body: "__EVENTTARGET="+target+"&__VIEWSTATE="+viewState+"&__EVENTVALIDATION="+eventValidation+"&__SCROLLPOSITIONX=0&__SCROLLPOSITIONY=0"+
              "&ctl00%24ContentPlaceHolder1%24ddlstSchoolYear="+placeHolder
            });
          })
          .then((r) => r.text()).then((rt) => {
            let doc = new JSDOM(rt).window.document
            callback(doc);
          })
          .catch((err) => console.error(err));
}

// get ablmcc homework
function getABLMCCHW(className, callback) {
  return fetch('https://web.ablmcc.edu.hk/Content/07_parents/homework/index.aspx')
        .then(r => r.text()).then(rt => {
          let doc = new JSDOM(rt).window.document
          // Note the 259 is hard-coded, further dicussion should be made
          let target = "ctl00%24ContentPlaceHolder1%24"+(259+classNameConvert(className));
          let viewState = encodeURIComponent(doc.getElementById('__VIEWSTATE').attributes[3].nodeValue);
          let eventValidation = encodeURIComponent(doc.getElementById('__EVENTVALIDATION').attributes[3].nodeValue);

          return fetch('https://web.ablmcc.edu.hk/Content/07_parents/homework/index.aspx', {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: "__EVENTTARGET="+target+"&__VIEWSTATE="+viewState+"&__EVENTVALIDATION="+eventValidation+"&__SCROLLPOSITIONX=0&__SCROLLPOSITIONY=0"
          });

        })
        .then((r) => r.text()).then((rt) => {
          let doc = new JSDOM(rt).window.document
          callback(doc);
          return doc;
        })
        .catch((err) => console.error(err));
}

// get ablmcc contact info
// specialized, not the pattern above
function getABLMCCContactInfo(callback) {
  return fetch('https://web.ablmcc.edu.hk/CustomPage/26/content.html')
        .then(r => r.arrayBuffer()).then(arrayBuffer => iconv.decode(new Buffer(arrayBuffer), 'big5').toString()).then(async rt => {
          let doc = new JSDOM(rt).window.document
          // the result
          let result = []
          // find all category
          // all elements tag name is 'a'
          let a = doc.querySelectorAll('table')[0].querySelectorAll('a');
          console.log(a.length);
          let elements = []
          for (let i=0; i<a.length; i++) {
            let e = a[i];
            if (!e.href.includes('https://web.ablmcc.edu.hk')) e.href = e.href.replace('/CustomPage/', 'https://web.ablmcc.edu.hk/CustomPage/')
            if (e.href.includes('https://web.ablmcc.edu.hk/CustomPage/26/subjects/')) {
              // got category and inner link
              let category = e.textContent;
              let link = e.href;

              // add category to result
              result.push({
                category: category,
                list: [],
              })
              let currentIndex = result.length-1;

              // open inner request
              await fetch(link)
                .then(r2 => r2.text()).then(r2t => {
                  console.log(`Processing: ${category}`);
                  // hot fix on the fucking mistake occured on 旅遊與款待 page
                  if (category == '旅遊與款待') {
                    let n = r2t.lastIndexOf("<tr");
                    r2t = r2t.slice(0, n-1) + "</tr>" + r2t.slice(n-1);
                  }
                  // Parse finally
                  let docInner = new JSDOM(r2t).window.document

                  // Get the rows of the category
                  let list = Array.from(docInner.querySelectorAll('tr'));
                  list.shift();

                  list.forEach(l => {
                    if (l.querySelectorAll('b').length == 0) return;

                    let name; // set name
                    // find name

                    let baseElementName = l.querySelectorAll('td')[0];
                    let href = 'none';
                    if (baseElementName.querySelector('a') !== null && baseElementName.querySelector('a').href !== undefined) 
                      href = baseElementName.querySelector('a').href;
                    while (baseElementName.getElementsByTagName('font').length !== 0) baseElementName = baseElementName.getElementsByTagName('font').item(0);
                    while (baseElementName.getElementsByTagName('b').length !== 0) baseElementName = baseElementName.getElementsByTagName('b').item(0);
                    while (baseElementName.getElementsByTagName('a').length !== 0) baseElementName = baseElementName.getElementsByTagName('a').item(0);

                    name = baseElementName.textContent;



                    Array.from(l.getElementsByTagName('a')).forEach(elementa => {
                      if (elementa.href.includes('mailto')) {
                        //console.log(elementa);
                        let email = elementa.href.replace('mailto:', '');
                        result[currentIndex].list.push({
                          name: name,
                          email: email,
                          href: href,
                        });
                      }
                    });
                  });

                }).catch(err2 => console.error(err2));
            }
          }
          console.log(result);
          callback(result);
        })
        .catch(err => console.error(err));
}








export default class ablmccapi {
  constructor() {
    this.ablmcc = new Map([['NormalNews', undefined],['Notices', undefined],['About', undefined],['Career', undefined],['Assignments', undefined]]);
    this.requested = new Map([['NormalNews', false],['Notices', 10],['About', false],['Career', false],['Assignments', false]]);
  }

  checkAvailability(callback) {
    checkAvailability().then(state => callback(state));
  }

  getNormalNews(callback) {
    if(this.ablmcc.get('NormalNews')===undefined) {
      this.requested.set('NormalNews', true);
      getABLMCC('https://web.ablmcc.edu.hk/Content/08_others/01_what_is_new/index.aspx', (d) => {
        let table = d.querySelectorAll('.latestNews tr.content');

        //console.log(table);
        var json = {'content': []};
        //HTML Finding
        for(let i=0, p=0; i<table.length; i++) {
          let ele = table[i];
          let date = ele.querySelector('.date').textContent;
          let caption = ele.querySelector('.caption a').textContent;
          let description = ele.querySelector('.description').textContent;
          let table2 = ele.querySelector('table');

          if(table2 != undefined) {
            let ele2 = table2.querySelectorAll('tr');

            for(let j=0; j<ele2.length; j++) {
              let ele4 = ele2[j].querySelector('a');
              let text = ele4.textContent;
              let href = ele4.href;

              href = href.replace('../../..', 'https://web.ablmcc.edu.hk');
              if(ele2.length==1) text = caption;
              else text = caption + ' ' + text;

              json.content[p] = {'text': text, 'date': date, 'href': href, };
              p++;
            }
          } else {
            json.content[p] = {'text': caption, 'date': date, 'desciption': description};
            p++;
          }
        }
        this.ablmcc.set('NormalNews', json);
        callback(json);
      });
    } else if(this.requested.get('NormalNews')===true) {
      callback(this.ablmcc.get('NormalNews'));
    }
  }

  getNotices(year, callback) {
    getABLMCCNotices(year, (d) => {
        let table = d.querySelectorAll('.noticeList .content');
        var json = {'content': []};
        //HTML Finding
        for(let i=0, p=0; i<table.length; i++) {
          let ele = table[i];
          let date = ele.querySelector('.date').textContent;
          let caption = ele.querySelector('.caption a').textContent;
          let href = ele.querySelector('.caption a').href;
          href = href.replace('../../..', 'https://web.ablmcc.edu.hk');
          json.content[p++] = {'text': caption, 'date': date, 'href': href};
        }
        this.ablmcc.set('Notices', json);
        callback(json);
      });
  }

  //No checking***
  getHomework(className, callback) {
    console.log('call');
    /*callback( {'today': [
      {'subject': "Chinese", 'summary': "Testing 1111", 'date': "01-09-2017"}
    ], 'next': [
      {'subject': "Chinese", 'summary': "Testing 1111", 'date': "01-09-2017"}
    ], 'nextnext': [
      {'subject': "Chinese", 'summary': "Testing 1111", 'date': "01-09-2017"}
    ]} );*/
    getABLMCCHW(className, d => {
      console.log(d.textContent);
        let table = d.querySelectorAll('.homeworkIssue tr');
        let dueTable = d.querySelector('.twoDueHomeworkTable');
        var json = {'today': [], 'next': [], 'nextnext': []};
        //homeworkIssue finding
        json.today = table !== undefined || table !== [] ? HWBuilder(table) : [];
        //duetoHomework finding
        let left = dueTable.querySelector('.left'), right = dueTable.querySelector('.right');
        if(left.childNodes.length > 1) {
          let title = left.querySelector('.dueTableHeading').textContent;
          let table = left.querySelectorAll('table tr');
          console.log(table);
          json.next = HWBuilder(table);
          json.next.unshift(title);
        }
        if(right.childNodes.length > 1) {
          let title = right.querySelector('.dueTableHeading').textContent;
          let table = right.querySelectorAll('table tr');
          json.nextnext = HWBuilder(table);
          json.nextnext.unshift(title);
        }
        console.log(json);
        this.ablmcc.set('Notices', json);
        callback(json);
      }
    );
  }


  // Contact Info
  // Just a Wrapper
  // Using Callback system
  getContactInfo(callback) {
    if (this.ablmcc.get('About') === undefined) {
      getABLMCCContactInfo(json => {
        this.ablmcc.set('About', json);

        callback(json);
      });
    }
    return this.ablmcc.get('About');
  }
}
