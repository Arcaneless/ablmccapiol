# ablmccapiol
ABLMCC API Online
This API is online for scraping ABLMCC website information.
It will return the json form of the information
The functions are the following:

## Website
```
https://ablmccapiol.herokuapp.com/
```

## News
### Usage
```
https://ablmccapiol.herokuapp.com/news
```
Return the latest news from ABLMCC

## Notices
### Usage
```
https://ablmccapiol.herokuapp.com/notices
```
Return the most recent year notices from ABLMCC

#### Query
year=(2012-2018)
Look for older notices

Eg.
```
https://ablmccapiol.herokuapp.com/notices?year=2017
```
This queries the notices of the year 2017-2018

## Homework
### Usage
```
https://ablmccapiol.herokuapp.com/homework
```
Return homeworks that are upload to ABLMCC Website
(By default it reads 1A's homework if no query is made)

#### Query
class=(1A-6E)
(Senior form homework usually won't upload to the internet)

Eg.
```
https://ablmccapiol.herokuapp.com/homework?class=3B
```
This queries the homework list of class 3B

## Contact Info
### Usage
```
https://ablmccapiol.herokuapp.com/contactinfo
```
Return teachers email and website (if any)
