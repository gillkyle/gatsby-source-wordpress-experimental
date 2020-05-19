import stringify from "fast-json-stable-stringify"
import execall from "execall"
import cheerio from "cheerio"

const imgSrcRemoteFileRegex = /(?:src=\\")((?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])\.(?:jpeg|jpg|png|gif|ico|pdf|doc|docx|ppt|pptx|pps|ppsx|odt|xls|psd|mp3|m4a|ogg|wav|mp4|m4v|mov|wmv|avi|mpg|ogv|3gp|3g2|svg|bmp|tif|tiff|asf|asx|wm|wmx|divx|flv|qt|mpe|webm|mkv|txt|asc|c|cc|h|csv|tsv|ics|rtx|css|htm|html|m4b|ra|ram|mid|midi|wax|mka|rtf|js|swf|class|tar|zip|gz|gzip|rar|7z|exe|pot|wri|xla|xlt|xlw|mdb|mpp|docm|dotx|dotm|xlsm|xlsb|xltx|xltm|xlam|pptm|ppsm|potx|potm|ppam|sldx|sldm|onetoc|onetoc2|onetmp|onepkg|odp|ods|odg|odc|odb|odf|wp|wpd|key|numbers|pages))(?=\\"| |\.)/gim

const imgTagRegex = /<img([\w\W]+?)[\/]?>/gim

const findAndStoreReferencedImageNodeIds = ({
  nodeString,
  pluginOptions,
  referencedMediaItemNodeIds,
}) => {
  // if the lazyNodes plugin option is set we don't need to find
  // image node id's because those nodes will be fetched lazily in resolvers
  if (pluginOptions.type.MediaItem.lazyNodes) {
    return
  }

  // get an array of all referenced media file ID's
  const matchedIds = execall(/"id":"([^"]*)","sourceUrl"/gm, nodeString)
    .map((match) => match.subMatches[0])
    .filter((id) => id !== node.id)

  // push them to our store of referenced id's
  if (matchedIds.length) {
    matchedIds.forEach((id) => referencedMediaItemNodeIds.add(id))
  }
}

const fetchNodeHtmlImageMediaItemNodes = async () => {}

const getCheerioImgFromMatch = ({ match }) => {
  const parsedMatch = JSON.parse(`"${match}"`)

  const $ = cheerio.load(parsedMatch, {
    xml: {
      withDomLvl1: false,
      normalizeWhitespace: false,
      xmlMode: true,
      decodeEntities: false,
    },
  })

  const cheerioImg = $(`img`)[0]

  return {
    match,
    cheerioImg,
  }
}

const replaceNodeHtmlImages = async ({ nodeString, pluginOptions }) => {
  const imageUrlMatches = execall(imgSrcRemoteFileRegex, nodeString)
  const imgTagMatches = execall(imgTagRegex, nodeString)

  if (imageUrlMatches.length) {
    const images = imgTagMatches.map(getCheerioImgFromMatch).filter()

    const mediaItemNodes = await fetchNodeHtmlImageMediaItemNodes({ images })

    // find/replace mutate nodeString

    store.dispatch.imageNodes.addImgMatches(imageUrlMatches)
  }

  return nodeString
}

const processNodeString = ({ nodeString, pluginOptions }) => {
  // const nodeStringFilters = [replaceNodeHtmlImages,]
  const nodeStringWithGatsbyImages = replaceNodeHtmlImages({
    nodeString,
    pluginOptions,
  })

  // const nodeStringWithGatsbyImagesAndRelativeLinks = replaceNodeHtmlLinks({
  //   nodeString,
  //   pluginOptions,
  // })
  // return nodeStringWithGatsbyImagesAndRelativeLinks

  return nodeStringWithGatsbyImages
}

const processNode = ({
  node,
  pluginOptions,
  referencedMediaItemNodeIds,
  wpUrl,
}) => {
  const anchorTagRegex = new RegExp(
    // eslint-disable-next-line no-useless-escape
    `<a[\\\s]+[^>]*?href[\\\s]?=["'\\\\]*(${wpUrl}.*?)["'\\\\]*.*?>([^<]+|.*?)?<\/a>`,
    `gim`
  )

  const nodeString = stringify(node)

  findAndStoreReferencedImageNodeIds({
    nodeString,
    pluginOptions,
    referencedMediaItemNodeIds,
  })

  const processedNodeString = processNodeString({
    nodeString,
    pluginOptions,
  })

  // only parse if the nodeString has changed
  if (processedNodeString !== nodeString) {
    return JSON.parse(processedNodeString)
  } else {
    return node
  }
}

export { processNode }
