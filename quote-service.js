const cheerio = require("cheerio")
const axios = require("axios").default
const express = require("express")

const getPage = (url) => {
    return new Promise((resolve, reject)=>{
        axios.get(url).then(res=>{
            const ch = cheerio.load(res.data)
            resolve(ch)
        }).catch((e)=>{
            reject(e)
        })
    })
}

const getMultiPage = (urls = []) => {
    const promises = [...urls].map(url => axios.get(url))
    return new Promise((resolve, reject)=>{
        axios.all(promises).then((responses)=>{
            const mc = []
    
            for (let resp of responses){
                mc.push(cheerio.load(resp.data))
            }
            
            resolve(mc)
        }).catch((e)=>{
            reject(e)
        })
    })

}

const fetchedQuotes = []
const authorUrls = []
const fetchedAuthors = []

const start = async () => {
    const baseUrl = "http://quotes.toscrape.com"
    let $ = await getPage("http://quotes.toscrape.com/");
    

    $('.quote').each((i, el)=>{
        const text = $(el).find('.text').text().trim().slice(0, 50)
        const author = $(el).find('small.author').text()
        const authorUrl = $(el).find('span>a').attr('href')
        
        
        authorUrls.push(baseUrl + authorUrl)
        
    
        const tags = []

        $(el).find('div.tags a.tag').each((j, tagEl)=>{
            const t = $(tagEl).text()
            tags.push(t)
        })

        fetchedQuotes.push({ author, text, tags})
    })

    let nextPage = $('nav>ul.pager>li.next>a').attr('href')
    
    while(nextPage){
        const url = baseUrl + nextPage
        $ = await getPage(url);
        
        $('.quote').each((i, el)=>{
            const text = $(el).find('.text').text().trim().slice(0,50)
            const author = $(el).find('small.author').text()
            const authorUrl = $(el).find('span>a').attr('href')

            
            authorUrls.push(baseUrl + authorUrl)
            

            const tags = []
    
            $(el).find('div.tags a.tag').each((j, tagEl)=>{
                const t = $(tagEl).text()
                tags.push(t)
            })
    
            fetchedQuotes.push({author, text, tags})
        })
    
        nextPage = $('nav>ul.pager>li.next>a').attr('href')
    }
    
    console.log(fetchedQuotes.length)
}

const getAuthors = async () => {
    const auList = new Set(authorUrls);
    const  lost = await getMultiPage(auList)

    for (let link of lost){
        const $ = link
        const name = $('h3.author-title').text()
        const biography = $('.author-description').text().trim().slice(0, 50)
        const birthdate = $('.author-born-date').text()
        const location = $('.author-born-location').text()
        fetchedAuthors.push({name, biography, birthdate, location})
    }
    
}

const createService = () => {

    
    const app = express()


    app.get('/quotes', async (req,res)=>{
        if (fetchedQuotes.length < 1){
            await start()
            await getAuthors()
        }

        if (req.query.author){
            const newList = fetchedQuotes.filter(quote => quote.author === req.query.author)
            return res.json({data: newList})
        }

        if (req.query.tag){
            console.log(req.query.tag)
            const newList = fetchedQuotes.filter(quote => {
                for (let tag of quote.tags){
                    if (tag === req.query.tag){
                        return true
                    }
                }
                return false
            })
            return res.json({data: newList})
        }
        res.json({data: fetchedQuotes})
    })

    app.get('/authors', async (req, res)=>{
        if (fetchedQuotes.length < 1){
            await start()
            await getAuthors()
        }
        const localList = [...fetchedAuthors]

        if (req.query.name){
            const newList = localList.filter(author=> author.name === req.query.name)
            return res.json({"data": newList})
        }

        res.json({"data": fetchedAuthors})
    })

    return app
}

module.exports = {createService, fetchedQuotes}