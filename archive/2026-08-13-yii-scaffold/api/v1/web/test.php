<?php
if (!empty($_REQUEST['name']))
    createFiles($_REQUEST['name']);
else
    createAllFiles();
function createAllFiles()
{
    $filePath = __DIR__ . '/../modules/v1/controllers';
    //获取目录的文件夹地址
    $filesnames = scandir($filePath);
    $ret = array();
    //遍历所有文件
    foreach ($filesnames as $name) {
        if (strstr($name, '.php', $name) === false)//只处理php
            continue;
        $className = str_replace('Controller.php', '', $name);
        $funcs = createFile($filePath . '/' . $name, $className);
        if (empty($funcs))
            continue;
        $ret[] = $funcs;
    }
    echoTable($ret);
}

function createFiles($name)
{
    $filePath = __DIR__ . '/../modules/v1/controllers/' . $name . 'Controller.php';
    echo json_encode(createFile($filePath, $name));
    die();
}

function createFile($filePath, $className)
{

    $content = file_get_contents($filePath);
    $pattern = '/(\{[\s\S]*\/\*\*[\s\S]*?public function action.*\(\))/';
    preg_match($pattern, $content, $matches);
    if (empty($matches)) {
        return array();
    }
    $pattern2 = '/(\/\*\*[\s\S]*?public function action.*\(\))/';
    preg_match_all($pattern2, $matches[0], $matches2);
    $ret = array();
    if (count($matches2[0])) {
        foreach ($matches2[0] as $val) {
            preg_match('/.*public function action(.*)/', $val, $matches3);
            $ret[parseFunction($matches3[1])] = trim(parseDescription($val, $matches3[1]));
        }
    }
    $ret = array('class' => parseClass($className), 'func' => $ret);
    return $ret;
}

function parseFunction($str)
{
    $str = lcfirst($str);
    $str = str_replace(array('(', ')'), '', $str);
    $ret = '';
    for ($i = 0; $i < strlen($str); $i++) {
        if (ord($str[$i]) >= 65 && ord($str[$i]) <= 90) {
            $ret .= '-' . strtolower($str[$i]);
        } else {
            $ret .= $str[$i];
        }
    }
    return $ret;
}

function parseClass($str)
{
    $str = lcfirst($str);
    $ret = '';
    for ($i = 0; $i < strlen($str); $i++) {
        if (ord($str[$i]) >= 65 && ord($str[$i]) <= 90) {
            $ret .= '-' . strtolower($str[$i]);
        } else {
            $ret .= $str[$i];
        }
    }
    return $ret;
}

/**
 * 提取方法描述
 * @param $str
 * @return string
 */
function parseDescription($str, $func)
{
    /*$str1 = str_replace(array("\r\n", "\n", "\r"), '', $str);
    $str2 = substr($str1, 10);
    return substr($str2, 0, strpos($str2, '*'));*/

    $func = str_replace('(', '', $func);
    $func = str_replace(')', '', $func);
    $rule = '/\/\*\**\s+?\*([^\n\r]+)\s+[^\{]+(public)*\s+function\s+action' . $func . '/i';
    preg_match($rule, $str, $result);
    $back = '';
    if (!empty($result))
        $back = trim($result[1]);
    return $back;
}

function echoTable($arr)
{
    $str = '<table><tr><td style="width:200px;">类名</td><td style="width:200px;">方法名</td><td>方法备注</td></tr>';
    foreach ($arr as $row) {
        $className = $row['class'];
        foreach ($row['func'] as $key => $v) {
            $str .= '<tr><td>' . $className . '</td><td>' . $key . '</td><td>' . $v . '</td></tr>';
        }
    }
    $str .= '</table>';
    echo $str;
}